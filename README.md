# NYC-Room-finder

Staywise is a small machine-learning project that predicts the likely Airbnb room type for a New York City listing. Enter location, price, availability, host, and review details in the web form to see the predicted room type and the model's class probabilities.

The project includes a Jupyter notebook for dataset exploration and model training, a saved scikit-learn pipeline, and a FastAPI application with a browser-based interface.

> **Note:** This is an educational prediction project, not a booking service or a guarantee about an individual listing. Model predictions depend on the dataset and features supplied.

## Features

- Predicts a room type from listing details: `Entire home/apt`, `Private room`, or `Shared room`.
- Shows the predicted class, its model probability, and probabilities for each room type.
- Accepts NYC borough and neighbourhood, coordinates, nightly price, minimum nights, review details, host listing count, and yearly availability.
- Serves the web page, styles, JavaScript, and prediction API from one FastAPI app.
- Includes a Jupyter notebook that explores the NYC Airbnb 2019 data, compares classifiers, tunes a Random Forest pipeline, evaluates it, and saves the trained model.

## Project files

| File | Purpose |
| --- | --- |
| `main.py` | FastAPI app, input validation, static page routes, and `/predict` endpoint. |
| `index.html` | Staywise listing-details form and prediction-result layout. |
| `styles.css` | Responsive visual styling for the web app. |
| `script.js` | Neighbourhood suggestions and coordinates, form submission, and prediction display. |
| `NYC Airbnb room predictor.ipynb` | Data exploration, preprocessing, model comparison, tuning, and evaluation workflow. |
| `model_pipeline.pkl` | Serialized, fitted scikit-learn preprocessing and prediction pipeline used by the API. Stored in Git LFS. |
| `requirements.txt` | Python dependencies for running the API. |
| `.gitattributes` | Git LFS tracking configuration for the model file. |
| `.gitignore` | Excludes Python bytecode cache files. |

## Jupyter notebook workflow

In `NYC Airbnb room predictor.ipynb`, you worked through the complete machine-learning workflow, from loading and understanding the data to saving a fitted model for the web app:

1. **Loaded the dataset:** Used KaggleHub to download the New York City Airbnb Open Data CSV, `AB_NYC_2019.csv`, and loaded it into pandas. The notebook's saved output shows **48,895 listings and 16 columns**.
2. **Inspected data quality and fields:** Viewed sample records, column types, summary statistics, shape, null counts, and the available room-type labels. The saved null-count output shows **10,052 missing values each** in `last_review` and `reviews_per_month`; some listing and host names are also missing.
3. **Explored patterns visually:** Plotted room-type and borough counts, distributions of numeric listing features, room type against price, correlations among numeric features and coordinates, and listing locations on a longitude/latitude scatter plot colored by room type.
4. **Prepared a cleaned copy:** Created `df_clean` without listing/host identifiers and names or `last_review`; filled missing `reviews_per_month` values with zero; and capped `price` and `minimum_nights` at their 99th percentiles. You also checked numeric skewness.
5. **Built reusable preprocessing:** Set up a scikit-learn `ColumnTransformer` with median imputation and standard scaling for eight numeric features, plus most-frequent imputation and one-hot encoding for borough and neighbourhood. `handle_unknown="ignore"` allows neighbourhood categories not seen during fitting.
6. **Compared candidate classifiers:** Used three-fold cross-validation to compare class-balanced Logistic Regression, Decision Tree, Random Forest, and Gradient Boosting. The notebook's recorded mean accuracy and micro-F1 scores were:

   | Model | Accuracy | Micro-F1 |
   | --- | ---: | ---: |
   | Logistic Regression | 0.633 | 0.633 |
   | Decision Tree | 0.783 | 0.783 |
   | Random Forest | 0.851 | 0.851 |
   | Gradient Boosting | 0.850 | 0.850 |

7. **Tuned a Random Forest:** Ran a 10-iteration `RandomizedSearchCV` with three-fold cross-validation, optimizing micro-F1 over the number of trees, maximum depth, and minimum samples per split. The saved output reports `n_estimators=200`, `min_samples_split=10`, `max_depth=None`, with best cross-validation micro-F1 of **0.8512**.
8. **Evaluated on a holdout set:** Used a stratified 67%/33% train/test split, then evaluated the selected pipeline on the test portion. The saved notebook output reports **85.59% accuracy** and **0.7357 macro-F1**; a confusion-matrix heatmap visualizes performance across the room-type classes.
9. **Saved the trained pipeline:** Exported the fitted best pipeline as `model_pipeline.pkl`, which `main.py` loads to return predictions and probabilities.

The notebook results above are the values stored in the notebook's outputs; they describe that recorded run and are not a guarantee of future performance.

### Running the notebook

Install Jupyter and the notebook-specific packages in the same Python environment as the application:

```bash
python -m pip install notebook kagglehub numpy matplotlib seaborn
```

Launch Jupyter, open the notebook, and run its cells from top to bottom:

```bash
jupyter notebook
```

The notebook downloads the dataset at runtime; a network connection is required. Its dataset and training workflow is separate from the API, which only needs the saved model artifact.

> **Notebook implementation note:** The notebook creates `df_clean` for cleaning, but the train/test split currently uses `df` rather than `df_clean`. As a result, the documented cleaning steps are not applied to the data used for model selection and training. Review that cell and the evaluation results before using the notebook to retrain or compare models.

## FastAPI app and web interface

After developing and saving the model in the notebook, you built a web application around it:

- **`main.py`** loads `model_pipeline.pkl` when the FastAPI app starts, serves the HTML page and its CSS/JavaScript, validates prediction inputs with Pydantic, and implements `POST /predict`.
- **`index.html`, `styles.css`, and `script.js`** provide the Staywise form and results interface. The browser sends the entered listing details to the API and displays the predicted room type and class probabilities.
- **`requirements.txt`** lists the Python dependencies for running the API. The saved model must be present at the project root when the application starts.

### Run the web app locally

The application requires Python and Git LFS when cloning the repository, so the model file is downloaded.

1. Clone the repository and enter its folder:

   ```bash
   git lfs install
   git clone https://github.com/vikasprajapati97933-svg/NYC-Room-finder.git
   cd NYC-Room-finder
   ```

   If you already cloned without downloading the model, run `git lfs pull` from the repository folder.

2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   ```

   Windows PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   macOS/Linux:

   ```bash
   source .venv/bin/activate
   ```

3. Install the application dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Start the server from the project folder:

   ```bash
   uvicorn main:app --reload
   ```

5. Open <http://127.0.0.1:8000/> in a browser. Interactive API documentation is available at <http://127.0.0.1:8000/docs>.

If the model file is missing or is only an LFS pointer file, fetch it with `git lfs pull`.

### Prediction API

The `POST /predict` endpoint arranges the ten expected model features into a pandas DataFrame, then calls the fitted pipeline's `predict` and `predict_proba` methods.

| Field | Meaning | Validation |
| --- | --- | --- |
| `latitude` | Listing latitude | -90 to 90 |
| `longitude` | Listing longitude | -180 to 180 |
| `price` | Price per night in USD | Greater than 0 |
| `minimum_nights` | Minimum booking duration | 1 to 365 |
| `number_of_reviews` | Total reviews | 0 or greater |
| `reviews_per_month` | Average monthly reviews | 0 or greater |
| `calculated_host_listings_count` | Listings attributed to the host | 0 or greater |
| `availability_365` | Days available in the year | 0 to 365 |
| `neighbourhood_group` | NYC borough | Non-empty string |
| `neighbourhood` | NYC neighbourhood | Non-empty string |

Example request:

```json
{
  "latitude": 40.758,
  "longitude": -73.9855,
  "price": 175,
  "minimum_nights": 2,
  "number_of_reviews": 28,
  "reviews_per_month": 1.2,
  "calculated_host_listings_count": 2,
  "availability_365": 180,
  "neighbourhood_group": "Manhattan",
  "neighbourhood": "Midtown"
}
```

The response contains `Predicted_room_type`, a `Probability` array, and a `class_probabilities` object keyed by room type. The interface uses the class probabilities to show the match and confidence. Invalid inputs receive FastAPI/Pydantic validation errors.

### Deployment on Render

The application has been deployed as a Render web service. Visit [NYC Room Finder](https://nyc-room-finder.onrender.com/) to use the live app. The API's interactive documentation is available at <https://nyc-room-finder.onrender.com/docs>.

## Technology

- Python, pandas, and scikit-learn for data handling and machine learning.
- FastAPI, Pydantic, and Uvicorn for the prediction service.
- HTML, CSS, and browser JavaScript for the interface.
- Joblib for saving/loading the fitted pipeline; Git LFS for versioning the large model artifact.

