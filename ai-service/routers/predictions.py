from fastapi import APIRouter
from services.predictor import predict_demand, predict_peak_hours, predict_today_revenue

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/demand")
def demand():
    return predict_demand()


@router.get("/peak-hours")
def peak_hours():
    return predict_peak_hours()


@router.get("/revenue")
def revenue():
    return predict_today_revenue()
