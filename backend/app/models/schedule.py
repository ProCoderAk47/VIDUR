from app import db
from datetime import datetime

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(20), db.ForeignKey('case.case_id'), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM
    end_time = db.Column(db.String(5))  # HH:MM
    event_type = db.Column(db.String(50), nullable=False)  # 'hearing', 'meeting', 'research'
    description = db.Column(db.Text)
    location = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "date": self.date,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "event_type": self.event_type,
            "description": self.description,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }