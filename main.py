from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model_pipeline.pkl"
COLUMNS = [
    "latitude",
    "longitude",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "calculated_host_listings_count",
    "availability_365",
    "neighbourhood_group",
    "neighbourhood",
]

app = FastAPI(title="NYC Stay Finder", version="1.0.0")
model = joblib.load(MODEL_PATH)


class Features(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    price: float = Field(..., gt=0, description="Price per night, must be positive")
    minimum_nights: int = Field(
        ..., ge=1, le=365, description="Minimum nights required for booking"
    )
    number_of_reviews: int = Field(..., ge=0, description="Total number of reviews")
    reviews_per_month: float = Field(
        ..., ge=0, description="Average reviews per month"
    )
    calculated_host_listings_count: int = Field(
        ..., ge=0, description="Number of listings by this host"
    )
    availability_365: int = Field(
        ..., ge=0, le=365, description="Days available out of 365"
    )
    neighbourhood_group: str = Field(
        ..., min_length=1, description="Borough or neighbourhood group"
    )
    neighbourhood: str = Field(
        ..., min_length=1, description="Specific neighbourhood name"
    )


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/styles.css", include_in_schema=False)
def styles():
    return FileResponse(BASE_DIR / "styles.css", media_type="text/css")


@app.get("/script.js", include_in_schema=False)
def script():
    return FileResponse(
        BASE_DIR / "script.js", media_type="application/javascript"
    )


@app.post("/predict")
def predict(features: Features):
    row = pd.DataFrame([features.model_dump()], columns=COLUMNS)
    prediction = str(model.predict(row)[0])
    probabilities = model.predict_proba(row)[0]

    return {
        "Predicted_room_type": prediction,
        "Probability": probabilities.tolist(),
        "class_probabilities": {
            str(label): float(probability)
            for label, probability in zip(model.classes_, probabilities)
        },
    }
