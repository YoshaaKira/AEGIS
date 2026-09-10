"""Relational persistence schema; Alembic migrations should be generated from this metadata."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DepotRecord(Base):
    __tablename__ = "depots"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)


class RouteRecord(Base):
    __tablename__ = "routes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    origin_id: Mapped[str] = mapped_column(ForeignKey("depots.id"))
    destination_id: Mapped[str] = mapped_column(ForeignKey("depots.id"))
    cost: Mapped[float] = mapped_column(Float)
    time_hours: Mapped[float] = mapped_column(Float)
    risk_prior: Mapped[float] = mapped_column(Float)
    restricted_goods: Mapped[str] = mapped_column(Text, default="[]")


class ShipmentRecord(Base):
    __tablename__ = "shipments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    origin_id: Mapped[str] = mapped_column(ForeignKey("depots.id"))
    destination_id: Mapped[str] = mapped_column(ForeignKey("depots.id"))
    goods_type: Mapped[str] = mapped_column(String)
    weight_kg: Mapped[float] = mapped_column(Float)
    deadline_hours: Mapped[float | None] = mapped_column(Float, nullable=True)


class PlanRecord(Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    objective: Mapped[str] = mapped_column(String)
    total_cost: Mapped[float] = mapped_column(Float)
    expected_regret: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String)


class PlanStopRecord(Base):
    __tablename__ = "plan_stops"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), index=True)
    shipment_id: Mapped[str] = mapped_column(ForeignKey("shipments.id"), index=True)
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id"))
    sequence: Mapped[int]


class DisruptionEventRecord(Base):
    __tablename__ = "disruption_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    type: Mapped[str] = mapped_column(String)
    edge_id: Mapped[str] = mapped_column(ForeignKey("routes.id"))
    severity: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class BenchmarkRunRecord(Base):
    __tablename__ = "benchmark_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"))
    aegis_cost: Mapped[float] = mapped_column(Float)
    aegis_regret: Mapped[float] = mapped_column(Float)
    ortools_cost: Mapped[float] = mapped_column(Float)
    ortools_regret: Mapped[float] = mapped_column(Float)
