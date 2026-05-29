from fastapi import APIRouter, Query
from services.recommender import get_popular_items, get_recommendations_for_items

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/popular")
def popular(limit: int = Query(10, ge=1, le=50)):
    return get_popular_items(limit)


@router.get("/for-order")
def for_order(items: str = Query("", description="Comma-separated menu item IDs")):
    item_ids = [i.strip() for i in items.split(",") if i.strip()]
    return get_recommendations_for_items(item_ids)
