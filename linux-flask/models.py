from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=True, index=True)
    external_id = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    snapshots = db.relationship(
        "Snapshot", back_populates="profile", cascade="all, delete-orphan", lazy=True
    )


class Snapshot(db.Model):
    __tablename__ = "snapshots"

    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey("profiles.id"), nullable=False, index=True)
    captured_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    profile = db.relationship("Profile", back_populates="snapshots")
    members = db.relationship(
        "SnapshotMember", back_populates="snapshot", cascade="all, delete-orphan", lazy=True
    )


class SnapshotMember(db.Model):
    __tablename__ = "snapshot_members"

    id = db.Column(db.Integer, primary_key=True)
    snapshot_id = db.Column(db.Integer, db.ForeignKey("snapshots.id"), nullable=False, index=True)
    relation = db.Column(db.String(20), nullable=False)  # followers | following
    username = db.Column(db.String(150), nullable=False)
    external_id = db.Column(db.String(150), nullable=True)

    snapshot = db.relationship("Snapshot", back_populates="members")

    __table_args__ = (
        db.UniqueConstraint("snapshot_id", "relation", "username", name="uq_snapshot_relation_username"),
    )
