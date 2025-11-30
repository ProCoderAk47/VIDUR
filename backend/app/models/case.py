from app import db
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime

class Case(db.Model):
    __table_args__ = (db.UniqueConstraint('case_id', 'owner_id', name='uix_case_user'),)
    id = db.Column(db.Integer, primary_key=True)
    # owner_id scopes cases to a specific user (prevents data mixing between users)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    case_id = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200))
    category = db.Column(db.String(100))
    priority = db.Column(db.String(10))
    next_hearing = db.Column(db.String(50))
    status = db.Column(db.String(100))

    # AI Agent Outputs
    # Evidence Checker Agent
    evidence_data = db.Column(db.JSON)  # Fused evidence from Evidence Checker
    evidence_confidence = db.Column(db.Float, default=0.0)  # 0-1 confidence
    
    # Summarizer Agent
    summary_data = db.Column(db.JSON)  # Summary output (facts, issues, summary)
    summary_confidence = db.Column(db.Float, default=0.0)  # 0-1 confidence
    
    # Legal Action Agent
    legal_suggestions = db.Column(db.JSON)  # Suggested legal actions with laws
    legal_confidence = db.Column(db.Float, default=0.0)  # 0-100 confidence percentage
    
    # Pipeline Status & Metadata
    analysis_status = db.Column(
        db.String(50), 
        default="pending"
    )  # pending, processing, completed, failed
    analysis_timestamp = db.Column(db.DateTime, default=datetime.now)
    last_updated = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Error Tracking
    analysis_error = db.Column(db.Text)  # Store error message if analysis fails
    
    # Evidence Files
    evidence_files = db.Column(db.JSON)  # Array of evidence file objects with name, path, size, type, etc.

    def to_dict(self):

        return {
            "owner_id": self.owner_id,
            "id": self.id,
            "case_id": self.case_id,
            "title": self.title,
            "category": self.category,
            "priority": self.priority,
            "next_hearing": self.next_hearing,
            "status": self.status,
            # AI Analysis Results
            "evidence_data": self.evidence_data,
            "evidence_confidence": self.evidence_confidence,
            "summary_data": self.summary_data,
            "summary_confidence": self.summary_confidence,
            "legal_suggestions": self.legal_suggestions,
            "legal_confidence": self.legal_confidence,
            # Evidence Files
            "evidence_files": self.evidence_files or [],
            # Metadata
            "analysis_status": self.analysis_status,
            "analysis_timestamp": self.analysis_timestamp.isoformat() if self.analysis_timestamp else None,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None
        }
    
    def to_dict_minimal(self):
        """Convert to minimal dictionary (without AI data)"""
        return {
            "id": self.id,
            "case_id": self.case_id,
            "title": self.title,
            "category": self.category,
            "priority": self.priority,
            "next_hearing": self.next_hearing,
            "status": self.status,
            "analysis_status": self.analysis_status,
            "evidence_files": self.evidence_files or []
        }
    
    def update_evidence(self, evidence_data, confidence):
        """Update evidence analysis results"""
        self.evidence_data = evidence_data
        self.evidence_confidence = confidence
        self.analysis_status = "processing"
        self.last_updated = datetime.now()
    
    def update_summary(self, summary_data, confidence):
        """Update summarizer results"""
        self.summary_data = summary_data
        self.summary_confidence = confidence
        self.last_updated = datetime.now()
    
    def update_legal_suggestions(self, legal_suggestions, confidence):
        """Update legal action agent results"""
        self.legal_suggestions = legal_suggestions
        self.legal_confidence = confidence
        self.analysis_status = "completed"
        self.analysis_timestamp = datetime.now()
        self.last_updated = datetime.now()
    
    def mark_analysis_complete(self):
        """Mark analysis as complete"""
        self.analysis_status = "completed"
        self.analysis_timestamp = datetime.now()
        self.last_updated = datetime.now()
    
    def mark_analysis_failed(self, error_message: str):
        """Mark analysis as failed with error"""
        self.analysis_status = "failed"
        self.analysis_error = error_message
        self.last_updated = datetime.now()
    
    def add_evidence_file(self, file_info: dict):
        """Add an evidence file to the case"""
        if self.evidence_files is None:
            self.evidence_files = []
        if isinstance(self.evidence_files, list):
            self.evidence_files.append(file_info)
        else:
            self.evidence_files = [file_info]
        # Flag the JSON column as modified so SQLAlchemy detects the change
        flag_modified(self, 'evidence_files')
        self.last_updated = datetime.now()
    
    def set_evidence_files(self, files: list):
        """Set the evidence files list"""
        self.evidence_files = files if files else []
        # Flag the JSON column as modified so SQLAlchemy detects the change
        flag_modified(self, 'evidence_files')
        self.last_updated = datetime.now()
