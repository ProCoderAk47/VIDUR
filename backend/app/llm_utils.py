import json
import re
import time
import math
import ast
from typing import Dict, List
from datetime import datetime

from app.llm_config import LLMConfig

class PromptBuilder:

    @staticmethod
    def compress_text(text: str, max_tokens: int, llm) -> str:
        token_count = llm.count_tokens(text)
        if token_count <= max_tokens:
            return text

        chunks = []
        words = text.split()
        approx_tokens_per_word = 1.5
        max_words_per_chunk = max(100, int(max_tokens / approx_tokens_per_word / 2))

        for i in range(0, len(words), max_words_per_chunk):
            chunk_text = " ".join(words[i:i+max_words_per_chunk])
            prompt = f"Summarize the following content in 5-7 sentences:\n\n{chunk_text}"
            summary = llm.generate(prompt, max_new_tokens=256)
            chunks.append(summary)

        merged = " ".join(chunks)
        if llm.count_tokens(merged) > max_tokens:
            prompt = f"Summarize the following content in 5-7 sentences:\n\n{merged}"
            merged = llm.generate(prompt, max_new_tokens=256)

        return merged

    @staticmethod
    def build_summarizer_prompt(fused_evidence, llm) -> str:
        facts = "\n".join(fused_evidence.get("facts", []))
        witness_statements = "\n".join(fused_evidence.get("witness_statements", []))

        # AUTO COMPRESS
        facts = PromptBuilder.compress_text(facts, max_tokens=1500, llm=llm)
        witness_statements = PromptBuilder.compress_text(witness_statements, max_tokens=800, llm=llm)

        legal_refs = ", ".join(fused_evidence.get("legal_references", []))

        return f"""
You are an expert Indian legal summarizer. Produce JSON summary.

FACTS:
{facts}

WITNESS STATEMENTS:
{witness_statements}

LEGAL REFERENCES:
{legal_refs}

Return JSON with: facts, legal_issues, summary, confidence_score
"""

class ResponseParser:

    @staticmethod
    def parse_json_response(response: str) -> Dict:
        try:
            # 1. Try to extract a JSON block more robustly (strip fences, balanced braces)
            if not response or not isinstance(response, str):
                return {}

            # Remove surrounding markdown code fences if present
            fence_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
            if fence_match:
                candidate = fence_match.group(1).strip()
            else:
                # Fallback: find first balanced JSON object starting at first '{'
                start = response.find('{')
                if start == -1:
                    return {}
                s = response[start:]
                # find the matching closing brace using a simple stack
                stack = []
                end_idx = None
                for i, ch in enumerate(s):
                    if ch == '{':
                        stack.append('{')
                    elif ch == '}':
                        if stack:
                            stack.pop()
                        if not stack:
                            end_idx = i
                            break
                candidate = s[:end_idx+1] if end_idx is not None else s

            # 2. Try plain JSON load first
            try:
                return json.loads(candidate)
            except Exception:
                pass

            # 3. Clean common LLM mistakes: remove /* */ and // comments, trailing commas
            cleaned = re.sub(r'/\*.*?\*/', '', candidate, flags=re.DOTALL)
            cleaned = re.sub(r'//.*', '', cleaned)
            cleaned = re.sub(r',\s*([\]\}])', r'\1', cleaned)

            # 4. Try json.loads again
            try:
                return json.loads(cleaned)
            except Exception:
                pass

            # 5. Try Python literal eval fallback (handles single quotes, True/False, etc.)
            try:
                obj = ast.literal_eval(cleaned)
                # Ensure result is a dict-like JSON object
                if isinstance(obj, (dict, list)):
                    return json.loads(json.dumps(obj))
            except Exception:
                pass

            # 6. Last-ditch: try to coerce single quotes to double quotes (best-effort)
            coerced = re.sub(r"(?P<quote>')(?P<content>[^']*?)'(?=\s*:)", r'"\g<content>"', cleaned)
            coerced = re.sub(r"'([^']*?)'", r'"\1"', coerced)
            coerced = re.sub(r',\s*([\]\}])', r'\1', coerced)
            try:
                return json.loads(coerced)
            except Exception as e:
                # Provide debug information to logs and return empty dict
                print(f"JSON Parse Error details: {e}")
                return {}
        except Exception as e:
            print(f"JSON Parse Error details: {e}")
            return {}

    @staticmethod
    def extract_sections(response: str) -> Dict:
        sections = {
            "facts": "",
            "legal_issues": [],
            "summary": "",
            "applicable_laws": [],
            "confidence": 0.0
        }

        facts_match = re.search(r'(?:FACTS?:|Facts?:)(.*?)(?=(?:LEGAL|ISSUES?|SUMMARY|$))', response, re.IGNORECASE | re.DOTALL)
        if facts_match:
            sections["facts"] = facts_match.group(1).strip()

        issues_match = re.search(r'(?:LEGAL\s+ISSUES?|ISSUES?):(.*?)(?=(?:SUMMARY|CONFIDENCE|$))', response, re.IGNORECASE | re.DOTALL)
        if issues_match:
            sections["legal_issues"] = [i.strip() for i in issues_match.group(1).splitlines() if i.strip()]

        summary_match = re.search(r'(?:SUMMARY?):(.*?)(?=(?:CONFIDENCE|APPLICABLE|$))', response, re.IGNORECASE | re.DOTALL)
        if summary_match:
            sections["summary"] = summary_match.group(1).strip()

        conf_match = re.search(r'(?:CONFIDENCE|confidence)[\s:]*([0-9.]+)', response)
        if conf_match:
            try:
                conf_val = float(conf_match.group(1))
                sections["confidence"] = conf_val if conf_val <= 1 else conf_val / 100
            except ValueError:
                sections["confidence"] = 0.0

        return sections

    @staticmethod
    def extract_laws_and_sections(response: str) -> List[Dict]:
        laws = []
        pattern = r'(?:Section|Sec\.?\s*|IPC\s*|ICA\s*|CrPC\s*)?(\d+[A-Z]*)\s*[,:]?\s*([^,\n]+?(?:Act|Code|Law|Clause)[^,\n]*)'
        matches = re.finditer(pattern, response, re.IGNORECASE)
        for match in matches:
            laws.append({
                "section": match.group(1),
                "law": match.group(2).strip(),
                "relevance": "Applicable to this case"
            })
        return laws

class ConfidenceCalculator:

    @staticmethod
    def calculate_summary_confidence(response_quality: float, entity_count: int, law_references: int) -> float:
        base_confidence = response_quality * 0.6
        entity_bonus = min(entity_count / 10, 0.2) * 0.2
        law_bonus = min(law_references / 5, 0.2) * 0.2
        total_confidence = base_confidence + entity_bonus + law_bonus
        return min(total_confidence, 1.0)

    @staticmethod
    def calculate_action_confidence(matching_precedents: int, law_clarity: float, evidence_strength: float) -> float:
        precedent_score = min(matching_precedents / 3, 1.0) * 30
        law_score = law_clarity * 35
        evidence_score = evidence_strength * 35
        confidence = precedent_score + law_score + evidence_score
        return int(min(confidence, 100))

class FormatHelper:

    @staticmethod
    def format_timestamp() -> str:
        return datetime.utcnow().isoformat() + "Z"

    @staticmethod
    def format_law_reference(section: str, act: str, description: str = "") -> Dict:
        return {
            "law": f"Section {section}, {act}",
            "section": section,
            "description": description,
            "relevance": "Applicable to this case"
        }

def safe_generate(llm, prompt, max_length=4096, retries=3):
    for i in range(retries):
        try:
            return llm.generate(prompt, max_new_tokens=max_length)
        except Exception as e:
            print(f"Gemini API error: {e}, retrying ({i+1}/{retries})...")
            time.sleep(2 ** i)
    return "ERROR: Failed after retries"
