"""
Upload routes for handling evidence file uploads
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from app import db
from app.models.case import Case
from flask_jwt_extended import jwt_required, get_jwt_identity

upload_bp = Blueprint('upload_bp', __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'documents': {'txt', 'doc', 'docx', 'md'},
    'pdf': {'pdf'},
    'images': {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'},
    'audio': {'mp3', 'wav', 'm4a', 'ogg', 'flac'},
    'video': {'mp4', 'avi', 'mov', 'mkv', 'webm'}
}

def allowed_file(filename, category):
    """Check if file extension is allowed for the given category"""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    allowed_exts = ALLOWED_EXTENSIONS.get(category, set())
    return ext in allowed_exts

def get_upload_directory():
    """Get or create the upload directory"""
    basedir = Path(__file__).parent.parent
    upload_dir = basedir / 'uploads' / 'evidence'
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir

@upload_bp.route('/evidence', methods=['POST'])
@jwt_required()
def upload_evidence():
    """
    Upload an evidence file for a case
    
    Form data:
    - file: The file to upload
    - case_id: The case ID
    - category: The file category (documents, pdf, images, audio, video)
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get case_id and category
        case_id = request.form.get('case_id')
        category = request.form.get('category', 'documents')
        
        if not case_id:
            return jsonify({"error": "case_id is required"}), 400
        
        # Find the case and ensure it belongs to the authenticated user
        identity = get_jwt_identity()
        try:
            user_id = int(identity)
        except Exception:
            return jsonify({"error": "invalid user identity"}), 401

        case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
        if not case:
            return jsonify({"error": f"Case {case_id} not found"}), 404
        
        # Validate file extension
        if not allowed_file(file.filename, category):
            return jsonify({
                "error": f"File type not allowed for category '{category}'. Allowed: {ALLOWED_EXTENSIONS.get(category, [])}"
            }), 400
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        
        # Save file
        upload_dir = get_upload_directory()
        file_path = upload_dir / unique_filename
        file.save(str(file_path))
        
        # Get file metadata
        file_size = os.path.getsize(file_path)
        # Store relative path from app directory
        basedir = Path(__file__).parent.parent
        relative_path = file_path.relative_to(basedir)
        
        file_info = {
            "name": original_filename,
            "file_name": original_filename,  # For compatibility
            "path": str(relative_path),
            "file_path": str(relative_path),  # For compatibility
            "absolute_path": str(file_path),  # Keep absolute for file access
            "size": file_size,
            "file_size_bytes": file_size,  # For compatibility
            "type": category,
            "file_type": category,  # For compatibility
            "category": category,
            "uploaded_at": datetime.now().isoformat(),
            "unique_filename": unique_filename
        }
        
        # Add file to case's evidence_files
        case.add_evidence_file(file_info)
        db.session.commit()
        
        # Debug: Print to verify
        print(f"[UPLOAD] Added file to case {case_id}: {original_filename}")
        print(f"[UPLOAD] Evidence files count: {len(case.evidence_files) if case.evidence_files else 0}")
        
        return jsonify({
            "message": "File uploaded successfully",
            "file_path": str(file_path),
            "file_info": file_info
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@upload_bp.route('/evidence/<string:case_id>/<string:file_id>', methods=['GET'])
@jwt_required()
def download_evidence(case_id, file_id):
    """
    Download an evidence file for a case
    
    Args:
        case_id: The case ID
        file_id: The file identifier (can be index or unique_filename)
    """
    try:
        # Find the case and verify ownership
        identity = get_jwt_identity()
        try:
            user_id = int(identity)
        except Exception:
            return jsonify({"error": "invalid user identity"}), 401

        case = Case.query.filter_by(case_id=case_id, owner_id=user_id).first()
        if not case:
            return jsonify({"error": f"Case {case_id} not found"}), 404
        
        # Get evidence files
        if not case.evidence_files or len(case.evidence_files) == 0:
            return jsonify({"error": "No evidence files found for this case"}), 404
        
        # Find the file - try by index first, then by unique_filename
        file_info = None
        try:
            # Try as index
            file_index = int(file_id)
            if 0 <= file_index < len(case.evidence_files):
                file_info = case.evidence_files[file_index]
        except ValueError:
            # Try as unique_filename
            for f in case.evidence_files:
                if f.get('unique_filename') == file_id or f.get('name') == file_id:
                    file_info = f
                    break
        
        if not file_info:
            return jsonify({"error": "File not found"}), 404
        
        # Get file path - prefer absolute_path, fallback to path
        file_path_str = file_info.get('absolute_path') or file_info.get('path') or file_info.get('file_path')
        
        if not file_path_str:
            return jsonify({"error": "File path not found"}), 404
        
        # Resolve path
        basedir = Path(__file__).parent.parent
        if os.path.isabs(file_path_str):
            file_path = Path(file_path_str)
        else:
            # Handle both Windows and Unix paths
            file_path_str = file_path_str.replace('\\', os.sep).replace('/', os.sep)
            file_path = basedir / file_path_str
        
        # Check if file exists
        if not file_path.exists():
            # Try alternative: check if it's in uploads directory
            upload_dir = get_upload_directory()
            if file_info.get('unique_filename'):
                alt_path = upload_dir / file_info.get('unique_filename')
                if alt_path.exists():
                    file_path = alt_path
                else:
                    return jsonify({"error": "File not found on server"}), 404
            else:
                return jsonify({"error": "File not found on server"}), 404
        
        # Get original filename for download
        original_filename = file_info.get('name') or file_info.get('file_name') or file_path.name
        
        # Send file with proper headers
        return send_file(
            str(file_path),
            as_attachment=True,
            download_name=original_filename,
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

