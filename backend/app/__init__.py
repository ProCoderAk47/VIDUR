import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=False)
    basedir = os.path.abspath(os.path.dirname(__file__))
    # ensure database folder exists
    os.makedirs(os.path.join(basedir, 'database'), exist_ok=True)

    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'database/db.sqlite3')}"
    app.config['SECRET_KEY'] = 'supersecretkey'
    app.config['JWT_SECRET_KEY'] = 'jwtsecretkey'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    # register blueprints (import here to avoid circular imports)
    from .routes.case import case_bp
    from .routes.dashboard import dashboard_bp
    from .routes.ai import ai_bp 
    from .routes.schedule import schedule_bp
    from .routes.auth import auth_bp
    from .routes.upload import upload_bp
    from app.models.case import Case

    app.register_blueprint(case_bp, url_prefix="/api/case")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(schedule_bp, url_prefix="/api/schedule")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(upload_bp, url_prefix="/api/upload")


    @app.route('/')
    def home():
        return {"message": "Judicial Management System Backend is Running 🚀"}

    return app
