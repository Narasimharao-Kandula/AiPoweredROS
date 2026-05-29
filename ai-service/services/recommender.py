from database import query


def get_popular_items(limit: int = 10) -> list[dict]:
    """Get most popular menu items based on order frequency."""
    rows = query(f"""
        SELECT mi.id, mi.name, mi.price, c.name as category,
               COUNT(oi.id) as order_count,
               SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi."menuItemId"
        JOIN categories c ON c.id = mi."categoryId"
        WHERE mi."isAvailable" = true
        GROUP BY mi.id, mi.name, mi.price, c.name
        ORDER BY total_sold DESC
        LIMIT {limit}
    """)

    if not rows:
        return []

    max_sold = max(r["total_sold"] for r in rows) if rows else 1
    return [
        {
            "menu_item_id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "price": float(r["price"]),
            "score": round(r["total_sold"] / max_sold, 2),
            "reason": f"Sold {r['total_sold']} times — most popular item"
            if i == 0
            else f"Sold {r['total_sold']} times",
        }
        for i, r in enumerate(rows)
    ]


def get_recommendations_for_items(item_ids: list[str]) -> list[dict]:
    """Recommend add-on items based on frequently co-ordered items."""
    if not item_ids:
        return get_popular_items(5)

    placeholders = ",".join(f"'{i}'" for i in item_ids)
    rows = query(f"""
        SELECT mi.id, mi.name, mi.price, c.name as category,
               COUNT(*) as co_occurrence
        FROM order_items oi1
        JOIN order_items oi2 ON oi1."orderId" = oi2."orderId"
        JOIN menu_items mi ON mi.id = oi2."menuItemId"
        JOIN categories c ON c.id = mi."categoryId"
        WHERE oi1."menuItemId" IN ({placeholders})
          AND oi2."menuItemId" NOT IN ({placeholders})
          AND mi."isAvailable" = true
        GROUP BY mi.id, mi.name, mi.price, c.name
        ORDER BY co_occurrence DESC
        LIMIT 5
    """)

    if not rows:
        return get_popular_items(5)

    max_co = max(r["co_occurrence"] for r in rows) if rows else 1
    return [
        {
            "menu_item_id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "price": float(r["price"]),
            "score": round(r["co_occurrence"] / max_co, 2),
            "reason": "Often ordered together with your selection",
        }
        for r in rows
    ]
