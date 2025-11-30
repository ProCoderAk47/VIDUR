from typing import Dict, Any, List
from datetime import datetime
import json
import traceback
import tiktoken

from app.llm_config import get_llm_model
from app.llm_utils import PromptBuilder, ResponseParser, FormatHelper
import time
# ==============================
# TOKEN CHUNKING RESTORED HERE
# ==============================
def chunk_text(text: str, max_tokens: int = 1024) -> List[str]:
    """
    Splits a long text into multiple token-safe chunks.
    """
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)

    chunks = []
    for i in range(0, len(tokens), max_tokens):
        chunk_tokens = tokens[i:i + max_tokens]
        chunks.append(encoding.decode(chunk_tokens))
    return chunks


def merge_summaries(summary_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge chunk-level summary JSON outputs into one final summarization.
    """
    merged_summary_text = "\n".join(
        chunk.get("summary_text", "") for chunk in summary_chunks
    )

    confidence = sum(
        chunk.get("confidence_score", 0.0) for chunk in summary_chunks
    ) / max(1, len(summary_chunks))

    return {
        "summary_text": merged_summary_text,
        "confidence_score": confidence
    }


# =================================
#  SUMMARIZER AGENT (UPDATED)
# =================================
class SummarizerAgent:
    def __init__(self):
        try:
            self.llm_model = get_llm_model()
            print("✓ Summarizer Agent initialized with Gemini model")
        except Exception as e:
            print(f"⚠ Warning: LLM model not available: {e}")
            self.llm_model = None

    def summarize_evidence(self, fused_evidence: Dict[str, Any]) -> Dict[str, Any]:
        case_id = fused_evidence.get("case_id", "unknown")
        fused_text = fused_evidence.get("fused_data", {}).get("combined_text", "")

        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            input_tokens = len(encoding.encode(fused_text))

            if input_tokens > 3000:
                print("⚠ Long evidence detected → using chunked summarization")

                chunks = chunk_text(fused_text, max_tokens=1200)
                chunk_summaries = []

                for chunk in chunks:
                    prompt = f"""
                    Summarize the following legal evidence chunk:

                    {chunk}

                    Return JSON with:
                    - summary_text
                    - confidence_score
                    """

                    raw = self.llm_model.generate(prompt, max_new_tokens=400)
                    time.sleep(2)
                    parsed = ResponseParser.parse_json_response(raw)

                    if not parsed:
                        parsed = {
                            "summary_text": f"Partial summary: {chunk[:200]}...",
                            "confidence_score": 0.3
                        }

                    chunk_summaries.append(parsed)

                merged = merge_summaries(chunk_summaries)

                # Convert merged result to final frontend format
                return self._build_final_output(
                    case_id,
                    merged["summary_text"],
                    fused_evidence,
                    merged["confidence_score"]
                )

            prompt = PromptBuilder.build_summarizer_prompt(
                fused_evidence.get("fused_data", {}),
                llm=self.llm_model
            )

            raw_response = self.llm_model.generate(prompt, max_new_tokens=1500)
            time.sleep(2)
            parsed_summary = self._parse_summary_response(raw_response, fused_evidence)
            confidence = self._calculate_summary_confidence(
                parsed_summary, fused_evidence.get("data_quality", {})
            )

            return self._build_final_output(
                case_id,
                parsed_summary.get("summary", ""),
                fused_evidence,
                confidence,
                parsed_summary
            )

        except Exception as e:
            tb = traceback.format_exc()
            err = self._error_response(case_id, str(e))
            err["metadata"]["traceback"] = tb
            return err

    def _build_final_output(self, case_id, summary_text, fused_evidence, confidence, parsed=None):
        if parsed is None:
            parsed = {}

        return {
            "case_id": case_id,
            "summary": {
                "facts": parsed.get("facts", []),
                "legal_issues": parsed.get("legal_issues", []),
                "summary": summary_text,
                "key_points": parsed.get("key_points", []),
                "confidence_score": confidence
            },
            "metadata": {
                "generated_at": FormatHelper.format_timestamp(),
                "model": "Gemini-2.0-flash",
                "evidence_sources": len(fused_evidence.get("source_files", [])),
                "entities_processed": fused_evidence.get("data_quality", {}).get("entities_extracted", 0)
            }
        }

    def _parse_summary_response(self, response: str, fused_evidence: Dict) -> Dict[str, Any]:
        try:
            if not response or len(response.strip()) < 8:
                return self._fallback_summary_structure(fused_evidence)

            parsed_json = ResponseParser.parse_json_response(response)
            if parsed_json and any(parsed_json.values()):
                return {
                    "facts": parsed_json.get("facts", []),
                    "legal_issues": parsed_json.get("legal_issues", []),
                    "summary": parsed_json.get("summary", ""),
                    "key_points": parsed_json.get("key_points", [])
                }

            sections = ResponseParser.extract_sections(response)
            if sections.get("summary") or sections.get("facts"):
                return {
                    "facts": sections.get("facts", []),
                    "legal_issues": sections.get("legal_issues", []),
                    "summary": sections.get("summary", ""),
                    "key_points": []
                }

            return self._fallback_summary_structure(fused_evidence)
        except Exception:
            return self._fallback_summary_structure(fused_evidence)

    def _fallback_summary_structure(self, fused_evidence: Dict) -> Dict[str, Any]:
        fused_data = fused_evidence.get("fused_data", {})
        facts = fused_data.get("facts", [])
        return {
            "facts": facts[:5] if isinstance(facts, list) else [],
            "legal_issues": fused_data.get("legal_references", [])[:3],
            "summary": "Case summary generated from available evidence.",
            "key_points": []
        }

    def _calculate_summary_confidence(self, summary: Dict, data_quality: Dict) -> float:
        summary_text = summary.get("summary", "")
        text_score = min(len(summary_text.split()) / 100, 1.0) * 0.4
        issues_score = min(len(summary.get("legal_issues", [])) / 3, 1.0) * 0.3
        facts_score = min(len(summary.get("facts", [])) / 5, 1.0) * 0.3
        return min(text_score + issues_score + facts_score, 1.0)

    def _error_response(self, case_id: str, error_msg: str) -> Dict[str, Any]:
        return {
            "case_id": case_id,
            "summary": {
                "facts": [],
                "legal_issues": [],
                "summary": f"Error during summarization: {error_msg}",
                "key_points": [],
                "confidence_score": 0.0
            },
            "metadata": {
                "generated_at": FormatHelper.format_timestamp(),
                "error": error_msg
            }
        }


class LegalSummarizer:
    def __init__(self):
        self.agent = SummarizerAgent()

    def process(self, fused_evidence: Dict[str, Any]) -> Dict[str, Any]:
        return self.agent.summarize_evidence(fused_evidence)


def get_legal_summarizer() -> LegalSummarizer:
    return LegalSummarizer()
