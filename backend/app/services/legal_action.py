from typing import Dict, Any, List
import json
from app.llm_config import get_llm_model, LLMConfig

class LegalCodeDatabase:
    LEGAL_CODES = {
        "IPC": {
            "name": "Indian Penal Code",
            "sections": {
                "34": "Acts done by several persons in furtherance of common intention",
                "73": "When breach of contract - compensation for loss or damage",
                "420": "Cheating and dishonestly inducing delivery of property",
                "408": "Dishonest misappropriation of property",
                "506": "Criminal intimidation",
                "507": "Criminal intimidation by an anonymous communication"
            }
        },
        "ICA": {
            "name": "Indian Contract Act, 1872",
            "sections": {
                "10": "Agreement to sell may be absolute or conditional",
                "12": "Consideration must not be illegal",
                "14": "Acceptance must be absolute",
                "23": "Consideration and object must be lawful",
                "32": "Mode of communication by act",
                "40": "When acceptance is complete as against acceptor",
                "55": "Effect of condition in agreement to sell",
                "73": "Compensation for breach of contract",
                "74": "Penalty clause - not enforceable as penalty",
                "76": "Agreement for sale of goods"
            }
        },
        "IEA": {
            "name": "Indian Evidence Act, 1872",
            "sections": {
                "3": "Relevancy defined",
                "5": "Relevancy of facts forming part of same transaction",
                "11": "Admissions",
                "17": "Confessions caused by inducement",
                "60": "Primary evidence",
                "62": "Original documents"
            }
        },
        "CrPC": {
            "name": "Code of Criminal Procedure",
            "sections": {
                "41": "Police to arrest without warrant in certain cases",
                "161": "Examination of witness by police",
                "251": "Examination of accused",
                "359": "Suspension of sentence by appellate court",
                "360": "Conditional discharge of first offender"
            }
        },
        "SA": {
            "name": "Specific Relief Act, 1963",
            "sections": {
                "10": "Specific performance of contract",
                "11": "Effect of breach of contract",
                "12": "Discretion to award damages",
                "15": "Rectification of instruments"
            }
        },
        "LA": {
            "name": "Limitation Act, 1963",
            "sections": {
                "3": "Establishment of bar of limitation",
                "14": "Extension of period in certain cases",
                "29": "Effect of substitution"
            }
        },
        "FA": {
            "name": "Family Laws (Marriage, Divorce, Succession)",
            "sections": {
                "13": "Divorce - grounds and procedures",
                "24": "Maintenance during marriage proceedings",
                "25": "Maintenance after divorce"
            }
        },
        "MV": {
            "name": "Motor Vehicles Act, 1988",
            "sections": {
                "140": "Insurer's liability for judgment debts",
                "166": "Compensation for death or permanent disablement"
            }
        }
    }

    @staticmethod
    def search_sections(keywords: List[str]):
        matches = []
        for code, data in LegalCodeDatabase.LEGAL_CODES.items():
            for sec, desc in data["sections"].items():
                for kw in keywords:
                    if kw.lower() in desc.lower() or kw.lower() in data["name"].lower():
                        matches.append({"code": code, "law_name": data["name"], "section": sec, "description": desc, "relevance_score": 0.8})
                        break
        return matches

class LegalActionAgent:
    def __init__(self):
        self.llm = get_llm_model()
        self.legal_db = LegalCodeDatabase()

    def recommend_actions(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        
        try:
            prompt = self._build_judge_prompt(case_data)
            
            response = self.llm.generate(prompt, max_new_tokens=2000)
            
            from app.llm_utils import ResponseParser
            parsed = ResponseParser.parse_json_response(response)
            
            if not parsed:
                return self._error_response(case_data.get('case_id'), 'Failed to parse legal analysis')
            
            return {
                'case_id': case_data.get('case_id'),
                'judicial_analysis': parsed,
                'status': 'success'
            }
        except Exception as e:
            return self._error_response(case_data.get('case_id'), str(e))
        
        except Exception as e:
            print(f"LLM Legal Action Error: {e}")

    def _build_judge_prompt(self, case_data: Dict[str, Any]) -> str:
        """
        Build prompt for JUDGE analysis (not client actions)
        Focus: verdict factors, legal precedents, case strength
        """
        summary = case_data.get('summary', {})
        evidence = case_data.get('evidence', {})
        
        prompt = f"""You are an expert legal advisor assisting a JUDGE in evaluating a consumer dispute case.

CASE DETAILS:
{summary.get('case_description', '')}

EVIDENCE ANALYSIS:
{evidence.get('summary_text', '')}

JUDGE'S DECISION SUPPORT:
Analyze this case and provide judicial guidance in the following JSON format:

{{
  "case_strength": {{
    "overall_verdict_likelihood": "percentage (0-100)",
    "complainant_favorable_probability": "percentage",
    "defendant_favorable_probability": "percentage",
    "reasoning": "brief explanation of verdict likelihood"
  }},
  "applicable_laws": [
    {{
      "law_name": "Act/Section name",
      "section": "exact section number",
      "relevance": "how it applies to this case",
      "complainant_favors": true/false,
      "precedent_strength": "Strong/Moderate/Weak"
    }}
  ],
  "critical_evidence_assessment": [
    {{
      "evidence_item": "what evidence",
      "judicial_weight": "High/Medium/Low",
      "supports_complainant": true/false,
      "reasoning": "why judge should weight this"
    }}
  ],
  "key_judgment_factors": [
    "factor 1 for verdict decision",
    "factor 2 for verdict decision"
  ],
  "judicial_recommendations": {{
    "suggested_verdict": "Partial/Full/No relief",
    "relief_amount_suggested": "amount if applicable",
    "reasoning": "detailed reasoning for suggested verdict",
    "alternative_scenarios": [
      "if judge finds X, then Y"
    ]
  }},
  "precedent_cases": [
    {{
      "case_citation": "Case Name v. Other Party",
      "year": "year decided",
      "similar_facts": "what facts are similar to current case",
      "judicial_holding": "what the court decided",
      "applicability": "how it applies here"
    }}
  ]
}}

Provide ONLY valid JSON. No markdown fences, no comments, no trailing commas."""
        
        return prompt
    
    def _error_response(self, case_id: str, error_msg: str) -> Dict[str, Any]:
        return {
            'case_id': case_id,
            'error': error_msg,
            'status': 'failed'
        }

    def _extract_keywords(self, text: str) -> List[str]:
        kws = []
        for w in [
            "breach", "contract", "compensation", "damages", "specific performance",
            "fraud", "cheating", "misrepresentation", "property", "title",
            "inheritance", "succession", "divorce", "maintenance", "custody",
            "accident", "injury", "death", "negligence", "criminal"
        ]:
            if w in text.lower():
                kws.append(w)
        return kws

_legal_agent = None
def get_legal_action_agent() -> LegalActionAgent:
    global _legal_agent
    if _legal_agent is None:
        _legal_agent = LegalActionAgent()
    return _legal_agent
