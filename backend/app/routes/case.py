from flask import Blueprint, request, jsonify, abort
from app import db
from app.models.case import Case
from app.models.schedule import Schedule
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

case_bp = Blueprint('case_bp', __name__)

@case_bp.route('/', methods=['GET'])
@jwt_required()
def list_cases():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    cases = Case.query.filter_by(owner_id=user_id).all()
    return jsonify([c.to_dict() for c in cases]), 200

@case_bp.route('/<string:case_id>', methods=['GET'])
@jwt_required()
def get_case(case_id):
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    c = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not c:
        return jsonify({"error": "Case not found"}), 404
    return jsonify(c.to_dict()), 200

@case_bp.route('/', methods=['POST'])
@jwt_required()
def create_case():
    data = request.get_json() or {}
    required = ['case_id']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    if Case.query.filter_by(case_id=data['case_id'], owner_id=user_id).first():
        return jsonify({"error": "case_id already exists"}), 400
    c = Case(
        case_id=data.get('case_id'),
        owner_id=user_id,
        title=data.get('title'),
        category=data.get('category'),
        priority=data.get('priority'),
        next_hearing=data.get('next_hearing'),
        status=data.get('status')
    )
    db.session.add(c)
    db.session.flush()  # Flush to get the case ID
    
    # Auto-create schedule entry if next_hearing is provided
    if data.get('next_hearing'):
        try:
            # Parse the date (format: YYYY-MM-DD)
            hearing_date = data.get('next_hearing')
            # Check if schedule already exists for this case and date
            existing_schedule = Schedule.query.filter_by(
                case_id=c.case_id,
                date=hearing_date,
                event_type='hearing'
            ).first()
            
            if not existing_schedule:
                schedule = Schedule(
                    case_id=c.case_id,
                    date=hearing_date,
                    start_time='09:00',  # Default time
                    end_time='10:00',   # Default 1 hour duration
                    event_type='hearing',
                    description=f"Hearing for case {c.case_id}: {c.title or 'Untitled Case'}"
                )
                db.session.add(schedule)
        except Exception as e:
            # Log error but don't fail case creation
            print(f"Warning: Could not create schedule entry: {e}")
    
    db.session.commit()
    return jsonify(c.to_dict()), 201

@case_bp.route('/<string:case_id>', methods=['PUT'])
@jwt_required()
def update_case(case_id):
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    c = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not c:
        return jsonify({"error": "Case not found"}), 404
    data = request.get_json() or {}
    old_next_hearing = c.next_hearing
    
    for field in ['title','category','priority','next_hearing','status']:
        if field in data:
            setattr(c, field, data[field])
    
    # Auto-create/update schedule entry if next_hearing is provided or changed
    if 'next_hearing' in data and data.get('next_hearing'):
        try:
            hearing_date = data.get('next_hearing')
            # Check if schedule already exists for this case and date
            existing_schedule = Schedule.query.filter_by(
                case_id=c.case_id,
                date=hearing_date,
                event_type='hearing'
            ).first()
            
            if not existing_schedule:
                schedule = Schedule(
                    case_id=c.case_id,
                    date=hearing_date,
                    start_time='09:00',  # Default time
                    end_time='10:00',   # Default 1 hour duration
                    event_type='hearing',
                    description=f"Hearing for case {c.case_id}: {c.title or 'Untitled Case'}"
                )
                db.session.add(schedule)
        except Exception as e:
            # Log error but don't fail case update
            print(f"Warning: Could not create schedule entry: {e}")
    elif 'next_hearing' in data and not data.get('next_hearing') and old_next_hearing:
        # If next_hearing is removed, optionally remove the schedule entry
        # We'll keep it for now to preserve history, but this can be customized
        pass
    
    db.session.commit()
    return jsonify(c.to_dict()), 200

@case_bp.route('/<string:case_id>', methods=['DELETE'])
@jwt_required()
def delete_case(case_id):
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except Exception:
        return jsonify({"error": "invalid user identity"}), 401

    c = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
    if not c:
        return jsonify({"error": "Case not found"}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200