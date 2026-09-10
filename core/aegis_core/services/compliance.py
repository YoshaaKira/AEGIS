from __future__ import annotations

from aegis_core.domain.models import Route, Shipment


def route_is_compliant(route: Route, shipment: Shipment) -> bool:
    """Forward-chaining seed rule: forbidden goods cannot traverse a restricted route."""
    return shipment.goods_type not in route.restricted_goods
