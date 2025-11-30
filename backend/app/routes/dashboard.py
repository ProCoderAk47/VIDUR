from flask import Blueprint, jsonify
from app import db
from app.models.case import Case
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics: case counts, priority breakdown, workload metrics"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    total_cases = Case.query.filter_by(owner_id=user_id).count()
    high_priority = Case.query.filter_by(owner_id=user_id, priority='High').count()
    medium_priority = Case.query.filter_by(owner_id=user_id, priority='Medium').count()
    low_priority = Case.query.filter_by(owner_id=user_id, priority='Low').count()
    # Case distribution by category
    categories = db.session.query(Case.category, db.func.count(Case.id)).filter(Case.owner_id == user_id).group_by(Case.category).all()
    category_dist = {cat: count for cat, count in categories}
    
    # AI Agent Readiness: cases with completed analysis
    completed_analysis = Case.query.filter_by(owner_id=user_id, analysis_status='completed').count()
    pending_analysis = Case.query.filter_by(owner_id=user_id, analysis_status='pending').count()
    
    data = {
        "total_cases": total_cases,
        "priority_breakdown": {
            "high": high_priority,
            "medium": medium_priority,
            "low": low_priority
        },
        "category_distribution": category_dist,
        "analysis_status": {
            "completed": completed_analysis,
            "pending": pending_analysis
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    return jsonify(data), 200


@dashboard_bp.route('/workload-metrics', methods=['GET'])
@jwt_required()
def get_workload_metrics():
    """Get judge's workload metrics: estimated court hours, average case time, etc."""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    total_cases = Case.query.filter_by(owner_id=user_id).count()
    # Estimate: assume 3 hrs per High, 2 hrs per Medium, 1 hr per Low (placeholder)
    high = Case.query.filter_by(owner_id=user_id, priority='High').count()
    medium = Case.query.filter_by(owner_id=user_id, priority='Medium').count()
    low = Case.query.filter_by(owner_id=user_id, priority='Low').count()
    estimated_hours = (high * 3) + (medium * 2) + (low * 1)
    
    avg_case_time = estimated_hours / max(total_cases, 1)
    
    data = {
        "total_estimated_court_hours": estimated_hours,
        "average_case_time_hours": round(avg_case_time, 2),
        "high_priority_cases": high,
        "medium_priority_cases": medium,
        "low_priority_cases": low
    }
    return jsonify(data), 200


@dashboard_bp.route('/upcoming-hearings', methods=['GET'])
@jwt_required()
def get_upcoming_hearings():
    """Get today's and upcoming hearings"""
    today = datetime.now().date()
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    upcoming = Case.query.filter(Case.owner_id == user_id, Case.next_hearing >= str(today)).order_by(Case.next_hearing).limit(10).all()
    
    data = {
        "upcoming_hearings": [
            {
                "case_id": c.case_id,
                "title": c.title,
                "next_hearing": c.next_hearing,
                "priority": c.priority,
                "status": c.status
            }
            for c in upcoming
        ]
    }
    return jsonify(data), 200


@dashboard_bp.route('/ai-insights/<string:case_id>', methods=['GET'])
@jwt_required()
def get_ai_insights(case_id):
    """Get AI agent insights for a specific case (summary + legal suggestions)"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    insights = {
        "case_id": case_id,
        "title": case.title,
        "summary": case.summary_data or {},
        "legal_suggestions": case.legal_suggestions or [],
        "evidence_data": case.evidence_data or {},
        "analysis_status": case.analysis_status,
        "analysis_timestamp": case.analysis_timestamp
    }
    return jsonify(insights), 200
@dashboard_bp.route('/case-counts', methods=['GET'])
@jwt_required()
def get_case_counts():
    """Get total case counts and priority breakdown"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    total_cases = Case.query.filter_by(owner_id=user_id).count()
    high_priority = Case.query.filter_by(owner_id=user_id, priority='High').count()
    medium_priority = Case.query.filter_by(owner_id=user_id, priority='Medium').count()
    low_priority = Case.query.filter_by(owner_id=user_id, priority='Low').count()

    data = {
        "total_cases": total_cases,
        "high_priority": high_priority,
        "medium_priority": medium_priority,
        "low_priority": low_priority
    }
    return jsonify(data), 200

@dashboard_bp.route('/category-distribution', methods=['GET'])
@jwt_required()
def get_category_distribution():    
    """Get case distribution by category"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    categories = db.session.query(Case.category, db.func.count(Case.id)).filter(Case.owner_id == user_id).group_by(Case.category).all()
    category_dist = {cat: count for cat, count in categories}

    return jsonify(category_dist), 200

@dashboard_bp.route('/analysis-status', methods=['GET'])
@jwt_required()
def get_analysis_status():
    """Get AI Agent Readiness: cases with completed vs pending analysis"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    completed_analysis = Case.query.filter_by(owner_id=user_id, analysis_status='completed').count()
    pending_analysis = Case.query.filter_by(owner_id=user_id, analysis_status='pending').count()

    data = {
        "completed": completed_analysis,
        "pending": pending_analysis
    }
    return jsonify(data), 200