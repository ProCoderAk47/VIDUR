from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)
from app import db, jwt
from app.models.user import User
from app.models.token_blocklist import TokenBlocklist
from datetime import timedelta

auth_bp = Blueprint("auth_bp", __name__)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get("jti")
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")

    if not username or not email or not password:
        return jsonify({"error": "username, email and password required"}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"error": "user with that username or email already exists"}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role=role
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"id": user.id, "username": user.username, "email": user.email, "role": user.role}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = data.get("username") or data.get("email")
    password = data.get("password")
    if not identifier or not password:
        return jsonify({"error": "username/email and password required"}), 400

    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    additional_claims = {"role": getattr(user, "role", "user")}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims, expires_delta=timedelta(hours=2))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=str(identity), expires_delta=timedelta(hours=2))
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = User.query.get(str(identity))
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"id": user.id, "username": user.username, "email": user.email, "role": user.role}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt().get("jti")
    if not TokenBlocklist.query.filter_by(jti=jti).first():
        db.session.add(TokenBlocklist(jti=jti))
        db.session.commit()
    return jsonify({"msg": "access token revoked"}), 200