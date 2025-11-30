import json
import hashlib
from typing import Dict, List, Any
from datetime import datetime
import os
import tempfile
from app.llm_config import get_llm_model
from app.llm_config import LLMConfig
import time

MAX_LENGTH = LLMConfig.MAX_CONTEXT if hasattr(LLMConfig, 'MAX_CONTEXT') else 4096

class FileValidator:
    SUPPORTED_TYPES = {
        'text': ['.txt', '.md', '.doc', '.docx'],
        'pdf': ['.pdf'],
        'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
        'audio': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'],
        'video': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    }

    @staticmethod
    def validate_file(file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            return {"valid": False, "error": "File not found", "file_path": file_path}

        file_ext = os.path.splitext(file_path)[1].lower()
        file_size = os.path.getsize(file_path)
        file_type = FileValidator._get_file_type(file_ext)
        file_hash = FileValidator._calculate_hash(file_path)

        return {
            "valid": True,
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "file_type": file_type,
            "file_size_bytes": file_size,
            "file_hash": file_hash,
            "timestamp": datetime.now().isoformat() + "Z"
        }

    @staticmethod
    def _get_file_type(file_ext: str) -> str:
        for ftype, extensions in FileValidator.SUPPORTED_TYPES.items():
            if file_ext in extensions:
                return ftype
        return "unknown"

    @staticmethod
    def _calculate_hash(file_path: str, algorithm: str = "sha256") -> str:
        h = hashlib.new(algorithm)
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    h.update(chunk)
            return h.hexdigest()
        except Exception as e:
            return f"error: {str(e)}"

class TextExtractor:
    @staticmethod
    def extract_from_text_file(file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8', errors="ignore") as f:
                return f.read()
        except Exception as e:
            return f"Error reading text file: {str(e)}"

    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text
        except ImportError:
            return "PDF extraction requires: pip install pdfplumber"
        except Exception as e:
            return f"Error extracting PDF: {str(e)}"

    @staticmethod
    def extract_from_image(file_path: str) -> str:
        try:
            from PIL import Image
            import pytesseract

            img = Image.open(file_path)
            return pytesseract.image_to_string(img)
        except ImportError:
            return "Image OCR requires: pip install pytesseract pillow"
        except Exception as e:
            return f"Error extracting image text: {str(e)}"

    @staticmethod
    def extract_from_audio(file_path: str) -> str:
        try:
            import google.generativeai as genai
            from app.llm_config import LLMConfig
            
            if not LLMConfig.GEMINI_API_KEY:
                return "Error: GEMINI_API_KEY not set"
                
            genai.configure(api_key=LLMConfig.GEMINI_API_KEY)
            
            # Upload the file to Gemini
            print(f"Uploading audio file {file_path} to Gemini...")
            audio_file = genai.upload_file(path=file_path)
            
            # Use a model that supports audio (Gemini 1.5/2.0 Flash)
            model = genai.GenerativeModel(LLMConfig.MODEL_NAME)
            
            response = model.generate_content(
                [audio_file, "Transcribe this audio file verbatim."],
                request_options={"timeout": 600}
            )
            
            # Clean up - delete the file from cloud storage
            try:
                audio_file.delete()
            except:
                pass
                
            return response.text
        except Exception as e:
            return f"Error transcribing audio with Gemini: {str(e)}"

    @staticmethod
    def extract_from_video(file_path: str) -> str:
        try:
            import google.generativeai as genai
            from app.llm_config import LLMConfig
            
            if not LLMConfig.GEMINI_API_KEY:
                return "Error: GEMINI_API_KEY not set"
                
            genai.configure(api_key=LLMConfig.GEMINI_API_KEY)
            
            # Upload the file to Gemini
            print(f"Uploading video file {file_path} to Gemini...")
            video_file = genai.upload_file(path=file_path)
            
            # Wait for processing (video takes time)
            import time
            while video_file.state.name == "PROCESSING":
                time.sleep(2)
                video_file = genai.get_file(video_file.name)
                
            if video_file.state.name == "FAILED":
                return "Error: Video processing failed"
            
            model = genai.GenerativeModel(LLMConfig.MODEL_NAME)
            
            response = model.generate_content(
                [video_file, "Transcribe the audio and describe the visual events in this video."],
                request_options={"timeout": 600}
            )
            
            try:
                video_file.delete()
            except:
                pass
                
            return response.text
        except Exception as e:
            return f"Error processing video with Gemini: {str(e)}"

class EntityExtractor:
    @staticmethod
    def extract_entities(text: str) -> Dict[str, Any]:
        from app.llm_utils import ResponseParser
        
        # Initialize with all expected keys
        entities = {
            "persons": [],
            "dates": [],
            "locations": [],
            "legal_references": [],
            "money_amounts": [],
            "numbers": [],
            "organizations": [],
            "witness_statements": [],
            "timeline_events": []
        }

        try:
            llm = get_llm_model()
            if llm:
                # Smarter prompt for comprehensive extraction
                prompt = (
                    "You are an expert legal analyst. Extract structured data from the following legal text.\n"
                    "Return a valid JSON object with the following keys:\n"
                    "- persons: List of names of people involved.\n"
                    "- organizations: List of organizations, companies, or institutions.\n"
                    "- dates: List of specific dates mentioned.\n"
                    "- locations: List of addresses, cities, or locations.\n"
                    "- money_amounts: List of financial figures/amounts.\n"
                    "- legal_references: List of acts, sections, or case laws cited.\n"
                    "- witness_statements: List of key quotes, testimonies, or assertions made by witnesses/parties.\n"
                    "- timeline_events: List of objects, each with 'date' and 'description' fields, representing the chronological sequence of events.\n\n"
                    f"TEXT:\n{text[:6000]}\n\nJSON:"
                )
                
                resp = llm.generate(prompt, max_new_tokens=MAX_LENGTH)
                parsed = ResponseParser.parse_json_response(resp)
                
                if parsed:
                    for k in entities.keys():
                        if k in parsed and isinstance(parsed[k], list):
                            entities[k] = parsed[k]
                    
                    # Merge organizations into persons if needed for compatibility, or keep separate
                    # For now, let's keep them in their respective buckets but ensure they are lists
                    return entities
                    
        except Exception as e:
            print(f"LLM Entity Extraction failed: {e}")

        # Minimal fallback only if LLM completely fails (returns empty lists)
        # The user requested to avoid regex, so we return empty structure rather than bad regex data
        # unless absolutely necessary.
        return entities

class DataFuser:
    @staticmethod
    def fuse_evidence(
        case_id: str,
        extracted_texts: Dict[str, str],
        file_metadata: List[Dict],
        entities: Dict[str, List]
    ) -> Dict[str, Any]:
        combined_text = "\n\n".join(
            f"[{source}]\n{text}" for source, text in extracted_texts.items() if text and not text.startswith("Error")
        )
        
        # Use LLM extracted timeline and statements directly
        timeline = entities.get("timeline_events", [])
        witness_statements = entities.get("witness_statements", [])
        
        # Fallback for facts: simple sentence splitting (can be improved with LLM later if needed)
        sentences = [s.strip() for s in combined_text.replace('\n', ' ').split('.') if len(s.strip()) > 20]

        return {
            "case_id": case_id,
            "fused_data": {
                "combined_text": combined_text,
                "facts": sentences[:20], # Raw facts from text
                "witness_statements": witness_statements,
                "legal_references": entities.get("legal_references", []),
                "timeline": timeline,
                "key_entities": {
                    "persons": list(set(entities.get("persons", []) + entities.get("organizations", []))),
                    "money_amounts": entities.get("money_amounts", []),
                    "dates": entities.get("dates", [])
                }
            },
            "source_files": [
                {
                    "file_name": m.get("file_name"),
                    "file_type": m.get("file_type"),
                    "file_size": m.get("file_size_bytes"),
                    "hash": m.get("file_hash")
                }
                for m in file_metadata if m.get("valid")
            ],
            "integrity_check": {
                "all_files_valid": all(m.get("valid") for m in file_metadata),
                "total_files": len(file_metadata),
                "processing_timestamp": datetime.now().isoformat() + "Z"
            },
            "data_quality": {
                "text_length": len(combined_text),
                "entities_extracted": sum(len(v) for v in entities.values() if isinstance(v, list)),
                "completeness_score": DataFuser._calculate_completeness(entities)
            }
        }

    @staticmethod
    def _calculate_completeness(entities: Dict) -> float:
        # Improved scoring based on presence of key fields
        score = 0.0
        if entities.get("persons"): score += 0.2
        if entities.get("dates"): score += 0.2
        if entities.get("witness_statements"): score += 0.2
        if entities.get("timeline_events"): score += 0.2
        if entities.get("legal_references"): score += 0.2
        return min(score, 1.0)

class DocumentRelevanceAnalyzer:
    def __init__(self):
        self.llm = get_llm_model()

    def assess_document_relevance(self, document_text: str, max_length: int = MAX_LENGTH) -> Dict[str, Any]:
        try:
            if not self.llm:
                return {"relevance_score": 0.5, "key_information": "", "relevance_category": "unknown"}

            prompt = f"""Analyze this legal document and provide:
1. Relevance score (0-100): How relevant is this to a legal case analysis?
2. Key information: What are the 2-3 most important pieces of information?
3. Category: Is it (evidence/statement/document/contract/other)?

DOCUMENT:
{document_text[:1000]}

Respond in JSON format: {{"relevance_score": <number>, "key_information": "<text>", "relevance_category": "<category>"}}"""

            response = self.llm.generate(prompt, max_new_tokens=max_length)
            time.sleep(2)
            try:
                result = json.loads(response.strip())
                return {
                    "relevance_score": min(100, max(0, result.get("relevance_score", 50))) / 100,
                    "key_information": result.get("key_information", ""),
                    "relevance_category": result.get("relevance_category", "unknown")
                }
            except:
                return {"relevance_score": 0.6, "key_information": "", "relevance_category": "unclassified"}

        except Exception as e:
            print(f"⚠ Error in document relevance analysis: {e}")
            return {"relevance_score": 0.5, "key_information": "", "relevance_category": "unknown"}

class EvidenceChecker:
    def __init__(self):
        self.validator = FileValidator()
        self.text_extractor = TextExtractor()
        self.entity_extractor = EntityExtractor()
        self.data_fuser = DataFuser()
        self.relevance_analyzer = DocumentRelevanceAnalyzer()
        self.llm = get_llm_model()

    def analyze_evidence(self, case_id: str, file_paths: Dict[str, List[str]]) -> Dict[str, Any]:
        extracted_texts = {}
        file_metadata = []
        all_entities = {
            "persons": [],
            "dates": [],
            "locations": [],
            "legal_references": [],
            "money_amounts": [],
            "numbers": [],
            "organizations": [],
            "witness_statements": [],
            "timeline_events": []
        }

        print(f"Analyzing evidence for case: {case_id}")

        for file_type in ["documents", "pdf", "images", "audio", "video"]:
            for file in file_paths.get(file_type, []):
                metadata = self.validator.validate_file(file)
                file_metadata.append(metadata)
                if metadata.get("valid"):
                    if file_type == "documents":
                        text = self.text_extractor.extract_from_text_file(file)
                        key_prefix = "document"
                    elif file_type == "pdf":
                        text = self.text_extractor.extract_from_pdf(file)
                        key_prefix = "pdf"
                    elif file_type == "images":
                        text = self.text_extractor.extract_from_image(file)
                        key_prefix = "image"
                    elif file_type == "audio":
                        text = self.text_extractor.extract_from_audio(file)
                        key_prefix = "audio"
                    else:
                        text = self.text_extractor.extract_from_video(file)
                        key_prefix = "video"

                    extracted_texts[f"{key_prefix}_{len(extracted_texts)}"] = text
                    print(f"  - Extracted {len(text)} chars from {file_type} file: {os.path.basename(file)}")
                    
                    entities = self.entity_extractor.extract_entities(text)
                    print(f"    > Found {len(entities.get('persons', []))} persons, {len(entities.get('dates', []))} dates, {len(entities.get('timeline_events', []))} events")
                    
                    for key in all_entities:
                        if key in entities:
                            all_entities[key].extend(entities.get(key, []))

        # Deduplicate simple lists (complex objects like timeline_events need careful handling)
        for key in ["persons", "dates", "locations", "legal_references", "money_amounts", "numbers", "organizations", "witness_statements"]:
            all_entities[key] = sorted(set(all_entities[key]))
            
        # For timeline events, we can't set() dicts. Just keep them all or dedup by date+desc?
        # Let's keep all for now, maybe sort by date later if possible.

        print(f"📊 Assessing document quality using LLM...")
        document_relevance_scores = {}

        # for source, text in extracted_texts.items():
        #     if text and not text.startswith("Error"):
        #         relevance = self.relevance_analyzer.assess_document_relevance(text)
        #         document_relevance_scores[source] = relevance
        #         print(f"  - {source}: Relevance {relevance['relevance_score']:.2%} ({relevance['relevance_category']})")

        fused_evidence = self.data_fuser.fuse_evidence(case_id, extracted_texts, file_metadata, all_entities)
        fused_evidence["document_relevance"] = document_relevance_scores

        try:
            if self.llm:
                combined_text = "\n".join([t for t in extracted_texts.values() if t and not t.startswith("Error")])
                validation_prompt = f"""Review this case evidence and identify:
1. What important information is present (3-5 items)
2. What critical information might be missing (3-5 items)
3. Overall case readiness (percentage 0-100)

EVIDENCE SUMMARY:
{combined_text[:2000]}

Respond in JSON format: {{"present_info": [...], "missing_info": [...], "readiness_score": <number>}}"""
                validation_response = self.llm.generate(validation_prompt, max_new_tokens=MAX_LENGTH)
                time.sleep(2) 
                try:
                    from app.llm_utils import ResponseParser
                    validation = ResponseParser.parse_json_response(validation_response)
                    if validation:
                        fused_evidence["completeness_assessment"] = {
                            "present_information": validation.get("present_info", []),
                            "missing_information": validation.get("missing_info", []),
                            "case_readiness": validation.get("readiness_score", 50) / 100
                        }
                except:
                    pass
        except Exception as e:
            print(f"⚠ LLM validation error: {e}")

        print(f"✓ Evidence analysis complete for case: {case_id}")
        return fused_evidence

_evidence_checker = None
def get_evidence_checker() -> EvidenceChecker:
    global _evidence_checker
    if _evidence_checker is None:
        _evidence_checker = EvidenceChecker()
    return _evidence_checker
