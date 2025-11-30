from flask import Blueprint, jsonify, request
from app import db
from app.models.case import Case
from app.models.schedule import Schedule
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity

schedule_bp = Blueprint('schedule_bp', __name__)

@schedule_bp.route('/', methods=['GET'])
@jwt_required()
def list_schedule():
    """Get all scheduled items (hearings, meetings, research blocks)"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    schedules = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Case.owner_id == user_id).order_by(Schedule.date, Schedule.start_time).all()
    data = [s.to_dict() for s in schedules]
    return jsonify(data), 200


@schedule_bp.route('/by-date/<string:date_str>', methods=['GET'])
@jwt_required()
def get_schedule_by_date(date_str):
    """Get schedule for a specific date (format: YYYY-MM-DD)"""
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    schedules = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Case.owner_id == user_id, Schedule.date == date).order_by(Schedule.start_time).all()
    data = [s.to_dict() for s in schedules]
    return jsonify({"date": date_str, "events": data}), 200


@schedule_bp.route('/by-range', methods=['GET'])
@jwt_required()
def get_schedule_by_range():
    """Get schedule for a date range (params: start_date, end_date in YYYY-MM-DD format)"""
    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')
    
    if not start_str or not end_str:
        return jsonify({"error": "Provide start_date and end_date"}), 400
    
    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    schedules = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Case.owner_id == user_id, Schedule.date >= start_date, Schedule.date <= end_date).order_by(Schedule.date, Schedule.start_time).all()
    data = [s.to_dict() for s in schedules]
    return jsonify({"start_date": start_str, "end_date": end_str, "events": data}), 200


@schedule_bp.route('/', methods=['POST'])
@jwt_required()
def create_schedule():
    """Create a new schedule event (hearing, meeting, research block)"""
    data = request.get_json() or {}
    required = ['case_id', 'date', 'start_time', 'event_type']
    
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {required}"}), 400
    
    # Verify case exists and belongs to authenticated user
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    case = Case.query.filter_by(case_id=data['case_id'], owner_id=user_id).first()
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    s = Schedule(
        case_id=data['case_id'],
        date=data['date'],
        start_time=data['start_time'],
        end_time=data.get('end_time'),
        event_type=data['event_type'],  # 'hearing', 'meeting', 'research'
        description=data.get('description'),
        location=data.get('location')
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@schedule_bp.route('/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id):
    """Get a specific schedule event"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    s = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Schedule.id == schedule_id, Case.owner_id == user_id).first()
    if not s:
        return jsonify({"error": "Schedule not found"}), 404
    return jsonify(s.to_dict()), 200


@schedule_bp.route('/<int:schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id):
    """Update a schedule event"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    s = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Schedule.id == schedule_id, Case.owner_id == user_id).first()
    if not s:
        return jsonify({"error": "Schedule not found"}), 404
    
    data = request.get_json() or {}
    for field in ['date', 'start_time', 'end_time', 'event_type', 'description', 'location']:
        if field in data:
            setattr(s, field, data[field])
    db.session.commit()
    return jsonify(s.to_dict()), 200


@schedule_bp.route('/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    """Delete a schedule event"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    s = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Schedule.id == schedule_id, Case.owner_id == user_id).first()
    if not s:
        return jsonify({"error": "Schedule not found"}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Schedule deleted"}), 200


@schedule_bp.route('/conflicts', methods=['GET'])
@jwt_required()
def check_conflicts():
    """Check for overlapping schedule conflicts"""
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    schedules = db.session.query(Schedule).join(Case, Schedule.case_id == Case.case_id).filter(Case.owner_id == user_id).order_by(Schedule.date, Schedule.start_time).all()
    conflicts = []
    
    for i, s1 in enumerate(schedules):
        for s2 in schedules[i+1:]:
            if s1.date == s2.date:
                # Check if times overlap
                if s1.start_time < s2.end_time and s2.start_time < s1.end_time:
                    conflicts.append({
                        "event_1": s1.to_dict(),
                        "event_2": s2.to_dict(),
                        "message": f"Conflict: {s1.case_id} overlaps with {s2.case_id}"
                    })
    
    return jsonify({"conflicts": conflicts, "total": len(conflicts)}), 200