from app import create_app, db
import os
import sys

# Initialize Flask app
app = create_app()

if __name__ == '__main__':
    # Create all database tables on startup
    with app.app_context():
        db.create_all()

    # Detect if reloader should be enabled
    use_reloader_env = os.environ.get('USE_RELOADER', '0').lower()
    use_reloader = use_reloader_env in ('1', 'true', 'yes')

    # Windows reloader warning
    if sys.platform == 'win32' and use_reloader:
        print("[Warning] Flask reloader on Windows may cause selector/threading issues.")
        print("[Info] Set USE_RELOADER=0 to disable.")

    # Run Flask application
    app.run(
        host="0.0.0.0",
        debug=True,
        use_reloader=use_reloader,
        threaded=True
    )
