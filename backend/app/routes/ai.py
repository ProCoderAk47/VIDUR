"""
AI Routes - Orchestrates the complete AI pipeline
Evidence Checker → Summarizer → Legal Action Agent
"""

from flask import Blueprint, request, jsonify, abort
from app import db
from app.models.case import Case
from app.services.evidence import get_evidence_checker
from app.services.summarizer import get_legal_summarizer
from app.services.legal_action import get_legal_action_agent
from flask_jwt_extended import jwt_required, get_jwt_identity

ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/analyze/<string:case_id>', methods=['POST'])
@jwt_required()
def analyze_case(case_id):
    """
    Analyze a case through the complete AI pipeline:
    1. Extract and validate evidence (Evidence Checker)
    2. Generate summary (Summarizer)
    3. Suggest legal actions (Legal Action Agent)
    
    Request body:
    {
        "evidence_files": {
            "documents": ["path/to/file1.txt"],
            "pdf": ["path/to/file.pdf"],
            "images": ["path/to/image.jpg"],
            "audio": ["path/to/audio.mp3"],
            "video": ["path/to/video.mp4"]
        },
        "force_reanalysis": false
    }
    Full AI pipeline:
    1. Load case
    2. Chunk text
    3. Summaries per chunk
    4. Merge summaries
    5. Evidence extraction
    6. Legal actions
    """
    try:
        # Get case from database and scope to authenticated user
        identity = get_jwt_identity()
        try:
            user_id = int(identity)
        except Exception:
            return jsonify({"error": "invalid user identity"}), 401

        case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
        if not case:
            return jsonify({"error": f"Case {case_id} not found"}), 404
        
        # Get request data
        data = request.get_json() or {}
        evidence_files = data.get("evidence_files", {})
        force_reanalysis = data.get("force_reanalysis", False)

        # If no evidence files provided in request, try to use files stored in case
        if not evidence_files and case.evidence_files:
            print(f"Using {len(case.evidence_files)} stored evidence files for analysis")
            evidence_files = {
                "documents": [],
                "pdf": [],
                "images": [],
                "audio": [],
                "video": []
            }
            
            for file_info in case.evidence_files:
                category = file_info.get("category") or file_info.get("type") or "documents"
                # Map category to supported keys if needed
                if category not in evidence_files:
                    # Try to map or default to documents
                    if category in ["text", "doc"]: category = "documents"
                    elif category in ["image", "photo"]: category = "images"
                    else: category = "documents"
                
                path = file_info.get("absolute_path") or file_info.get("path")
                if path:
                    evidence_files[category].append(path)
        
        # Check if analysis already completed
        if case.analysis_status == "completed" and not force_reanalysis:
            return jsonify({
                "case_id": case_id,
                "message": "Analysis already completed",
                "status": "cached",
                "evidence": case.evidence_data,
                "summary": case.summary_data,
                "legal_suggestions": case.legal_suggestions,
                "confidence_scores": {
                    "evidence": case.evidence_confidence,
                    "summary": case.summary_confidence,
                    "legal_actions": case.legal_confidence
                }
            }), 200
        
        # Mark as processing
        case.analysis_status = "processing"
        db.session.commit()
        
        # STAGE 1: Evidence Checker
        print(f"\n{'='*60}")
        print(f"STAGE 1: Evidence Extraction & Validation")
        print(f"{'='*60}")
        
        evidence_checker = get_evidence_checker()

        evidence_output = evidence_checker.analyze_evidence(case_id, evidence_files)
        
        case.update_evidence(
            evidence_data=evidence_output.get("fused_data"),
            confidence=evidence_output.get("data_quality", {}).get("completeness_score", 0.0)
        )
        db.session.commit()
        
        print(f"✓ Evidence Analysis Complete")
        print(f"  - Confidence: {case.evidence_confidence:.2%}")
        print(f"  - Entities Extracted: {evidence_output.get('data_quality', {}).get('entities_extracted', 0)}")
        
        # STAGE 2: Summarizer
        print(f"\n{'='*60}")
        print(f"STAGE 2: Case Summarization")
        print(f"{'='*60}")
        
        summarizer = get_legal_summarizer()
    
        summary_output = summarizer.process(evidence_output)
        
        case.update_summary(
            summary_data=summary_output.get("summary", {}),
            confidence=summary_output.get("summary", {}).get("confidence_score", 0.0)
        )
        db.session.commit()
        
        print(f"✓ Summarization Complete")
        print(f"  - Confidence: {case.summary_confidence:.2%}")
        print(f"  - Issues Identified: {len(summary_output.get('summary', {}).get('legal_issues', []))}")
        
        # STAGE 3: Legal Action Agent
        print(f"\n{'='*60}")
        print(f"STAGE 3: Legal Action Analysis")
        print(f"{'='*60}")
        
        legal_action_agent = get_legal_action_agent()
        
        case_data = {
            "case_id": case_id,
            "summary": summary_output.get("summary", {}),
            "evidence": evidence_output,
        }

        legal_output = legal_action_agent.recommend_actions(case_data)
        judicial_analysis = legal_output.get("judicial_analysis", {})
        suggestions = judicial_analysis.get("judicial_recommendations", {})
        
        # Calculate aggregate confidence
        primary_confidence = 0
        try:
            verdict_likelihood = judicial_analysis.get("case_strength", {}).get("overall_verdict_likelihood", "0")
            if isinstance(verdict_likelihood, (int, float)):
                primary_confidence = int(verdict_likelihood)
            elif isinstance(verdict_likelihood, str):
                primary_confidence = int(verdict_likelihood.replace('%', '').strip() or 0)
        except Exception as e:
            print(f"Error extracting confidence: {e}")
            primary_confidence = 0

        case.update_legal_suggestions(
            legal_suggestions=judicial_analysis,
            confidence=primary_confidence
        )
        db.session.commit()
        
        print(f"✓ Legal Analysis Complete")
        print(f"  - Verdict Likelihood: {primary_confidence}%")
        print(f"  - Applicable Laws Identified: {len(judicial_analysis.get('applicable_laws', []))}")
        print(f"  - Precedent Cases Referenced: {len(judicial_analysis.get('precedent_cases', []))}")
        
        # Mark analysis as complete
        case.mark_analysis_complete()
        db.session.commit()
        
        print(f"\n{'='*60}")
        print(f"FULL PIPELINE COMPLETE")
        print(f"{'='*60}\n")
        
        # return jsonify({
        #     "case_id": case_id,
        #     "status": "completed",
        #     "stages": {
        #         "evidence_checking": {
        #             "status": "completed",
        #             "confidence": case.evidence_confidence,
        #             "summary": f"Processed  {len(evidence_output.get('source_files', []))} files"
        #         },
        #         "summarization": {
        #             "status": "completed",
        #             "confidence": case.summary_confidence,
        #             "summary": f"Identified {len(summary_output.get('summary', {}).get('legal_issues', []))} issues"
        #         },
        #         "legal_action": {
        #             "status": "completed",
        #             "confidence": primary_confidence,
        #             "summary": f"Generated judicial analysis with {len(judicial_analysis.get('applicable_laws', []))} applicable laws"
        #         }
        #     },
        #     "analysis_results": {
        #         "evidence": evidence_output.get("fused_data"),
        #         "summary": summary_output.get("summary"),
        #         "legal_suggestions": judicial_analysis
        #     }
        # }), 200
        
        # Ensure frontend-friendly representations for applicable laws and confidence
        raw_laws = judicial_analysis.get("applicable_laws", [])
        applicable_laws_display = []
        for law in raw_laws:
            try:
                name = law.get("law_name", "") or law.get("name", "")
                section = law.get("section", "") or law.get("section_number", "")
                relevance = law.get("relevance", "") or law.get("relevance", "")
                line = name
                if section:
                    line += f" — {section}"
                if relevance:
                    line += f" : {relevance}"
                applicable_laws_display.append(line)
            except Exception:
                # Fallback: stringify the object
                applicable_laws_display.append(str(law))

        # Normalize legal suggestions for frontend consumption: produce simple array of actions
        legal_suggestions_display = []
        # If the judicial analysis already contains recommended actions, normalize them
        raw_recs = None
        if isinstance(judicial_analysis, dict):
            raw_recs = judicial_analysis.get("recommended_actions") or judicial_analysis.get("recommended_actions") or judicial_analysis.get("judicial_recommendations") or judicial_analysis.get("recommended_actions")

        # Try other common keys
        if not raw_recs:
            raw_recs = judicial_analysis.get("recommended_actions") if isinstance(judicial_analysis, dict) else None

        # If judicial_analysis itself is a single suggestion object, wrap it
        if not raw_recs and isinstance(judicial_analysis, dict) and any(k in judicial_analysis for k in ["suggested_action", "priority", "confidence"]):
            raw_recs = [judicial_analysis]

        # Build display-friendly suggestion objects
        if raw_recs and isinstance(raw_recs, list):
            for rec in raw_recs:
                try:
                    title = rec.get("suggested_action") or rec.get("action") or rec.get("title") or rec.get("suggestion") or "Suggested Action"
                    priority = rec.get("priority") or rec.get("priority_level") or "Normal"
                    conf = rec.get("confidence")
                    # If confidence is fractional (0-1), convert to percent
                    if isinstance(conf, float) and conf <= 1:
                        conf = int(conf * 100)
                    elif isinstance(conf, str) and conf.strip().endswith('%'):
                        try:
                            conf = int(conf.strip().replace('%', ''))
                        except Exception:
                            conf = None
                    elif isinstance(conf, (int, float)):
                        conf = int(conf)
                    else:
                        conf = None

                    laws = rec.get("applicable_laws") or rec.get("laws") or []
                    laws_display = []
                    if isinstance(laws, list):
                        for law in laws:
                            if isinstance(law, str):
                                laws_display.append(law)
                            elif isinstance(law, dict):
                                name = law.get("law_name") or law.get("law") or law.get("name") or ""
                                section = law.get("section") or law.get("section_number") or ""
                                if name and section:
                                    laws_display.append(f"{name} — {section}")
                                elif name:
                                    laws_display.append(name)
                                else:
                                    laws_display.append(str(law))
                    else:
                        laws_display = [str(laws)]

                    legal_suggestions_display.append({
                        "suggested_action": title,
                        "priority": priority,
                        "confidence": conf,
                        "applicable_laws": laws_display,
                        "reasoning": rec.get("reasoning") or rec.get("rationale") or "",
                        "risk_factors": rec.get("risk_factors") or [],
                        "next_steps": rec.get("next_steps") or []
                    })
                except Exception:
                    legal_suggestions_display.append({"suggested_action": str(rec)})

        # Provide backward-compatible keys for frontend: "legal_suggestions" and explicit numeric confidence
        response_payload = {
            "case_id": case_id,
            "status": "completed",
            "stages": {
                "evidence_checking": {
                    "status": "completed",
                    "confidence": case.evidence_confidence,
                    "summary": f"Processed {len(evidence_output.get('source_files', []))} files"
                },
                "summarization": {
                    "status": "completed",
                    "confidence": case.summary_confidence,
                    "summary": f"Identified {len(summary_output.get('summary', {}).get('legal_issues', []))} issues"
                },
                "legal_action": {
                    "status": "completed",
                    "confidence": primary_confidence,
                    "summary": f"Generated judicial analysis with {len(raw_laws)} applicable laws"
                }
            },
            "analysis_results": {
                "evidence": evidence_output.get("fused_data"),
                "summary": summary_output.get("summary"),
                # Keep full structured judicial analysis for detailed views
                "judicial_analysis": judicial_analysis,
                # Maintain older key expected by frontend UI
                "legal_suggestions": legal_suggestions_display,
                # Add UI-friendly display forms
                "applicable_laws_display": applicable_laws_display,
                "judicial_confidence": primary_confidence
            },
            "confidence_scores": {
                "evidence": case.evidence_confidence,
                "summary": case.summary_confidence,
                "legal_actions": primary_confidence
            }
        }

        return jsonify(response_payload), 200
    except Exception as e:
        print(f"\n✗ PIPELINE FAILED: {str(e)}")
        # try to find the case for this user to mark failure
        try:
            identity = get_jwt_identity()
            user_id = int(identity)
            case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
        except Exception:
            case = None
        if case:
            case.mark_analysis_failed(str(e))
            db.session.commit()
        
        return jsonify({
            "case_id": case_id,
            "error": f"Analysis failed: {str(e)}",
            "status": "failed"
        }), 500


@ai_bp.route('/case/<string:case_id>/evidence', methods=['GET'])
@jwt_required()
def get_evidence(case_id):
    """Get evidence analysis for a case"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    if not case.evidence_data:
        return jsonify({"error": "No evidence analysis available"}), 404
    
    return jsonify({
        "case_id": case_id,
        "evidence": case.evidence_data,
        "confidence": case.evidence_confidence,
        "timestamp": case.analysis_timestamp
    }), 200


@ai_bp.route('/case/<string:case_id>/summary', methods=['GET'])
@jwt_required()
def get_summary(case_id):
    """Get case summary"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    if not case.summary_data:
        return jsonify({"error": "No summary available"}), 404
    
    return jsonify({
        "case_id": case_id,
        "summary": case.summary_data,
        "confidence": case.summary_confidence,
        "timestamp": case.analysis_timestamp
    }), 200


@ai_bp.route('/case/<string:case_id>/legal-actions', methods=['GET'])
@jwt_required()
def get_legal_actions(case_id):
    """Get legal action suggestions for a case"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    if not case.legal_suggestions:
        return jsonify({"error": "No legal suggestions available"}), 404

    # Normalize stored suggestions for frontend (mirror analyze_case normalization)
    stored = case.legal_suggestions
    normalized = []
    try:
        if isinstance(stored, list):
            raw_recs = stored
        elif isinstance(stored, dict):
            raw_recs = stored.get("recommended_actions") or stored.get("recommended_actions") or stored.get("judicial_recommendations") or []
        else:
            raw_recs = [stored]

        for rec in raw_recs:
            if isinstance(rec, dict):
                title = rec.get("suggested_action") or rec.get("action") or rec.get("title") or "Suggested Action"
                priority = rec.get("priority") or "Normal"
                conf = rec.get("confidence")
                if isinstance(conf, float) and conf <= 1:
                    conf = int(conf * 100)
                elif isinstance(conf, str) and conf.strip().endswith('%'):
                    try:
                        conf = int(conf.strip().replace('%', ''))
                    except Exception:
                        conf = None
                elif isinstance(conf, (int, float)):
                    conf = int(conf)
                else:
                    conf = None

                laws = rec.get("applicable_laws") or rec.get("laws") or []
                laws_display = []
                if isinstance(laws, list):
                    for law in laws:
                        if isinstance(law, str):
                            laws_display.append(law)
                        elif isinstance(law, dict):
                            name = law.get("law_name") or law.get("law") or law.get("name") or ""
                            section = law.get("section") or law.get("section_number") or ""
                            if name and section:
                                laws_display.append(f"{name} — {section}")
                            elif name:
                                laws_display.append(name)
                            else:
                                laws_display.append(str(law))
                else:
                    laws_display = [str(laws)]

                normalized.append({
                    "suggested_action": title,
                    "priority": priority,
                    "confidence": conf,
                    "applicable_laws": laws_display,
                    "reasoning": rec.get("reasoning") or rec.get("rationale") or ""
                })
            else:
                normalized.append({"suggested_action": str(rec)})
    except Exception:
        normalized = [stored]

    return jsonify({
        "case_id": case_id,
        "legal_suggestions": normalized,
        "confidence": case.legal_confidence,
        "timestamp": case.analysis_timestamp
    }), 200


@ai_bp.route('/case/<string:case_id>/status', methods=['GET'])
@jwt_required()
def get_analysis_status(case_id):
    """Get analysis status for a case"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    return jsonify({
        "case_id": case_id,
        "analysis_status": case.analysis_status,
        "stages_completed": {
            "evidence_checking": case.evidence_data is not None,
            "summarization": case.summary_data is not None,
            "legal_action_analysis": case.legal_suggestions is not None
        },
        "confidence_scores": {
            "evidence": case.evidence_confidence,
            "summary": case.summary_confidence,
            "legal_actions": case.legal_confidence
        },
        "timestamp": case.analysis_timestamp,
        "error": case.analysis_error if case.analysis_status == "failed" else None
    }), 200


@ai_bp.route('/case/<string:case_id>/full-analysis', methods=['GET'])
@jwt_required()
def get_full_analysis(case_id):
    """Get complete analysis results for a case"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    if case.analysis_status != "completed":
        return jsonify({
            "error": f"Analysis not completed. Current status: {case.analysis_status}"
        }), 400
    
    return jsonify({
        "case_id": case_id,
        "case_details": {
            "title": case.title,
            "category": case.category,
            "priority": case.priority,
            "status": case.status,
            "next_hearing": case.next_hearing
        },
        "analysis_results": {
            "evidence": {
                "data": case.evidence_data,
                "confidence": case.evidence_confidence
            },
            "summary": {
                "data": case.summary_data,
                "confidence": case.summary_confidence
            },
            "legal_suggestions": {
                "data": case.legal_suggestions,
                "confidence": case.legal_confidence
            }
        },
        "analysis_metadata": {
            "status": case.analysis_status,
            "timestamp": case.analysis_timestamp,
            "last_updated": case.last_updated
        }
    }), 200


@ai_bp.route('/case/<string:case_id>/reanalyze', methods=['POST'])
@jwt_required()
def reanalyze_case(case_id):
    """Force re-analysis of a case"""
    data = request.get_json() or {}
    data["force_reanalysis"] = True
    
    # Call the main analyze endpoint
    return analyze_case(case_id)


@ai_bp.route('/health', methods=['GET'])
@jwt_required()
def health_check():
    """Health check endpoint for AI pipeline"""
    try:
        # Try to initialize each agent
        evidence_checker = get_evidence_checker()
        summarizer = get_legal_summarizer()
        legal_agent = get_legal_action_agent()
        
        return jsonify({
            "status": "healthy",
            "agents": {
                "evidence_checker": "ready",
                "summarizer": "ready",
                "legal_action_agent": "ready"
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503
