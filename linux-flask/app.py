import os
from datetime import datetime, timezone

from flask import Flask, jsonify, redirect, render_template, request, url_for
from sqlalchemy.exc import SQLAlchemyError

from models import Profile, Snapshot, SnapshotMember, db


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///phantomtrace.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

db.init_app(app)


with app.app_context():
    db.create_all()


def clean_member(value):
    """Normalize a member from {username, id} or a plain username string."""
    if isinstance(value, str):
        username = value.strip().lstrip("@").lower()
        return {"username": username, "id": None} if username else None
    if not isinstance(value, dict):
        return None
    username = str(value.get("username") or value.get("user") or "").strip().lstrip("@").lower()
    if not username:
        return None
    external_id = value.get("id") or value.get("pk") or value.get("user_id")
    return {"username": username, "id": str(external_id) if external_id is not None else None}


def parse_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("JSON gövdesi bir nesne olmalıdır.")
    profile = payload.get("profile") if isinstance(payload.get("profile"), dict) else payload
    username = str(profile.get("username") or profile.get("user") or "").strip().lstrip("@").lower()
    if not username:
        raise ValueError("username zorunludur.")

    result = {"username": username, "profile_id": profile.get("profile_id") or profile.get("id")}
    for relation in ("followers", "following"):
        raw = profile.get(relation, [])
        if not isinstance(raw, list):
            raise ValueError(f"{relation} bir liste olmalıdır.")
        members = [clean_member(item) for item in raw]
        result[relation] = [item for item in members if item]
    return result


def member_map(snapshot, relation):
    return {member.username: member for member in snapshot.members if member.relation == relation}


def calculate_delta(current, previous):
    delta = {}
    for relation in ("following", "followers"):
        now = member_map(current, relation)
        old = member_map(previous, relation) if previous else {}
        delta[relation] = {
            "added": sorted(set(now) - set(old)),
            "removed": sorted(set(old) - set(now)),
            "current_count": len(now),
            "previous_count": len(old),
        }
    return delta


def latest_pair(profile):
    snapshots = Snapshot.query.filter_by(profile_id=profile.id).order_by(Snapshot.captured_at.desc()).limit(2).all()
    current = snapshots[0] if snapshots else None
    previous = snapshots[1] if len(snapshots) > 1 else None
    return current, previous


@app.get("/")
def index():
    try:
        profiles = Profile.query.order_by(Profile.username.asc()).all()
        cards = []
        for profile in profiles:
            current, previous = latest_pair(profile)
            cards.append({"profile": profile, "snapshot": current, "has_previous": previous is not None})
        return render_template("index.html", cards=cards)
    except SQLAlchemyError:
        return render_template("index.html", cards=[], error="Veritabanı okunamadı."), 500


@app.get("/profile/<int:profile_id>")
def profile_view(profile_id):
    try:
        profile = Profile.query.get_or_404(profile_id)
        current, previous = latest_pair(profile)
        delta = calculate_delta(current, previous) if current else None
        return render_template("profile.html", profile=profile, snapshot=current, delta=delta)
    except SQLAlchemyError:
        return "Veritabanı okunamadı.", 500


@app.post("/api/sync")
def sync():
    try:
        data = parse_payload(request.get_json(silent=False))
        profile = Profile.query.filter_by(username=data["username"]).first()
        if profile is None:
            profile = Profile(username=data["username"], external_id=data["profile_id"])
            db.session.add(profile)
            db.session.flush()
        elif data["profile_id"]:
            profile.external_id = str(data["profile_id"])

        snapshot = Snapshot(profile=profile, captured_at=datetime.now(timezone.utc))
        for relation in ("followers", "following"):
            for member in data[relation]:
                snapshot.members.append(
                    SnapshotMember(
                        relation=relation,
                        username=member["username"],
                        external_id=member["id"],
                    )
                )
        db.session.add(snapshot)
        db.session.flush()

        previous = (
            Snapshot.query.filter(Snapshot.profile_id == profile.id, Snapshot.id != snapshot.id)
            .order_by(Snapshot.captured_at.desc())
            .first()
        )
        delta = calculate_delta(snapshot, previous)
        db.session.commit()
        return jsonify({"ok": True, "profile": data["username"], "snapshot_id": snapshot.id, "delta": delta}), 201
    except (ValueError, TypeError) as exc:
        db.session.rollback()
        return jsonify({"ok": False, "error": str(exc)}), 400
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"ok": False, "error": "Veritabanı işlemi başarısız."}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"ok": False, "error": "Beklenmeyen sunucu hatası."}), 500


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"ok": False, "error": "Dosya veya istek 10 MB sınırını aşıyor."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
