from pydantic import BaseModel
from datetime import datetime


class DemandPrediction(BaseModel):
    menu_item_id: str
    name: str
    predicted_quantity: int
    confidence: float


class PeakHour(BaseModel):
    hour: int
    predicted_orders: int


class Recommendation(BaseModel):
    menu_item_id: str
    name: str
    category: str
    price: float
    score: float
    reason: str
