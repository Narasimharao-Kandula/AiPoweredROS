from datetime import datetime
from collections import Counter
from database import query, query_one


def predict_demand() -> list[dict]:
    """Predict today's demand based on last 7 days of order history."""
    today = datetime.now().strftime("%Y-%m-%d")

    # Get items ordered in last 7 days
    rows = query("""
        SELECT mi.id, mi.name, SUM(oi.quantity) as total_ordered
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi."menuItemId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY mi.id, mi.name
        ORDER BY total_ordered DESC
    """)

    if not rows:
        return []

    max_ordered = max(r["total_ordered"] for r in rows)
    total_items = len(rows)

    return [
        {
            "menu_item_id": r["id"],
            "name": r["name"],
            "predicted_quantity": int(r["total_ordered"] / 7),
            "confidence": round(r["total_ordered"] / max_ordered, 2) if max_ordered > 0 else 0,
        }
        for r in rows
    ]


def predict_peak_hours() -> list[dict]:
    """Predict peak hours based on last 30 days of orders."""
    rows = query("""
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY hour
        ORDER BY count DESC
    """)

    total = sum(r["count"] for r in rows) if rows else 1
    return [
        {"hour": int(r["hour"]), "predicted_orders": int(r["count"])}
        for r in rows
    ]


def predict_today_revenue() -> dict:
    """Predict today's revenue based on last 30 days average."""
    row = query_one("""
        SELECT AVG("totalAmount") as avg_revenue
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          AND "createdAt"::date != CURRENT_DATE
    """)

    today_count = query_one("""
        SELECT COUNT(*) as count
        FROM orders
        WHERE "createdAt"::date = CURRENT_DATE
    """)

    avg_revenue = float(row["avg_revenue"]) if row and row["avg_revenue"] else 0
    today_orders = int(today_count["count"]) if today_count else 0

    return {
        "predicted_today_revenue": round(avg_revenue, 2),
        "current_today_orders": today_orders,
        "average_daily_revenue": round(avg_revenue, 2),
    }
