import pg8000.native as pg
from config import settings


def _connect():
    return pg.Connection(
        user="admin",
        password="admin123",
        host="localhost",
        port=5433,
        database="restaurant_os",
    )


def query(sql: str, params: tuple = ()) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.run(sql, params)
        columns = [c["name"] for c in conn.columns] if conn.columns else []
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()


def query_one(sql: str, params: tuple = ()) -> dict | None:
    rows = query(sql, params)
    return rows[0] if rows else None
