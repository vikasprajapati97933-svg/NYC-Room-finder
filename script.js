const form = document.querySelector("#predict-form");
const submitButton = form.querySelector(".submit-button");
const resultContent = document.querySelector("#result-content");
const resultCard = document.querySelector("#result-card");
const boroughSelect = document.querySelector("#neighbourhood_group");
const neighbourhoodInput = document.querySelector("#neighbourhood");
const neighbourhoodOptions = document.querySelector("#neighbourhood-options");

const neighbourhoodsByBorough = {
  Manhattan: [
    ["Midtown", 40.758, -73.9855],
    ["Harlem", 40.8116, -73.9465],
    ["Chelsea", 40.7465, -74.0014],
    ["East Village", 40.7265, -73.9815],
    ["Lower East Side", 40.715, -73.9843],
    ["Upper West Side", 40.787, -73.9754],
    ["Upper East Side", 40.7736, -73.9566],
    ["Hell's Kitchen", 40.7638, -73.9918],
    ["SoHo", 40.7233, -73.9985],
    ["Financial District", 40.7075, -74.0113],
  ],
  Brooklyn: [
    ["Williamsburg", 40.7081, -73.9571],
    ["Bushwick", 40.6944, -73.9213],
    ["Bedford-Stuyvesant", 40.6872, -73.9418],
    ["Park Slope", 40.671, -73.9814],
    ["Crown Heights", 40.6694, -73.9422],
    ["Greenpoint", 40.7295, -73.9507],
    ["Brooklyn Heights", 40.6958, -73.9936],
  ],
  Queens: [
    ["Astoria", 40.7644, -73.9235],
    ["Long Island City", 40.7447, -73.9485],
    ["Flushing", 40.7675, -73.8331],
    ["Sunnyside", 40.7433, -73.9196],
    ["Jackson Heights", 40.7557, -73.8831],
    ["Forest Hills", 40.7214, -73.8448],
  ],
  Bronx: [
    ["Fordham", 40.8619, -73.8977],
    ["Mott Haven", 40.8089, -73.9229],
    ["Riverdale", 40.9009, -73.9066],
    ["Kingsbridge", 40.8817, -73.9053],
    ["Highbridge", 40.838, -73.9279],
  ],
  "Staten Island": [
    ["St. George", 40.6437, -74.0776],
    ["Stapleton", 40.6276, -74.0772],
    ["Tompkinsville", 40.6368, -74.0772],
    ["New Dorp", 40.5732, -74.115],
  ],
};

function updateNeighbourhoodOptions() {
  const borough = boroughSelect.value;
  const neighbourhoods = neighbourhoodsByBorough[borough] ?? [];
  neighbourhoodOptions.replaceChildren(
    ...neighbourhoods.map(([name]) => {
      const option = document.createElement("option");
      option.value = name;
      return option;
    }),
  );
}

function updateCoordinates() {
  const borough = boroughSelect.value;
  const name = neighbourhoodInput.value.trim().toLowerCase();
  const match = (neighbourhoodsByBorough[borough] ?? []).find(
    ([neighbourhood]) => neighbourhood.toLowerCase() === name,
  );

  if (match) {
    document.querySelector("#latitude").value = match[1];
    document.querySelector("#longitude").value = match[2];
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  submitButton.querySelector(".button-label").textContent = isLoading
    ? "Finding your match..."
    : "Reveal my room type";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function showError(message) {
  resultContent.innerHTML = `
    <div class="result-error">
      <span class="error-icon" aria-hidden="true">!</span>
      <h2>We couldn't get your match.</h2>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function showPrediction(data, values) {
  const predicted = data.Predicted_room_type;
  const probabilities = data.class_probabilities;

  if (
    typeof predicted !== "string" ||
    !probabilities ||
    typeof probabilities !== "object"
  ) {
    throw new Error("The prediction service returned an unexpected response.");
  }

  const confidence = Number(probabilities[predicted]);
  if (!Number.isFinite(confidence)) {
    throw new Error("The prediction service did not return a confidence score.");
  }

  const categories = [
    "Entire home/apt",
    "Private room",
    "Shared room",
  ];
  const percentage = Math.round(confidence * 100);
  resultContent.innerHTML = `
    <div class="prediction-result">
      <p class="prediction-kicker">THE MODEL'S TOP MATCH</p>
      <h2><span>${escapeHtml(predicted)}</span></h2>
      <p class="prediction-meta">${escapeHtml(values.neighbourhood)}, ${escapeHtml(values.neighbourhood_group)} · NYC</p>
      <div class="confidence-row">
        <span>Model confidence</span>
        <strong>${percentage}%</strong>
      </div>
      <div class="confidence-track" role="progressbar" aria-label="Model confidence" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
        <div class="confidence-fill"></div>
      </div>
      <div class="probability-list" aria-label="Probabilities by room type">
        ${categories
          .map((category) => {
            const value = Number(probabilities[category] ?? 0);
            const safePercentage = Number.isFinite(value)
              ? Math.max(0, Math.min(100, value * 100))
              : 0;
            return `
              <div class="probability-item${category === predicted ? " is-predicted" : ""}">
                <span class="probability-label">${category}</span>
                <span class="probability-value">${Math.round(safePercentage)}%</span>
                <div class="probability-track"><div class="probability-fill" data-width="${safePercentage}%"></div></div>
              </div>`;
          })
          .join("")}
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const fill = resultContent.querySelector(".confidence-fill");
    if (fill) fill.style.width = `${percentage}%`;
    resultContent.querySelectorAll(".probability-fill").forEach((bar) => {
      bar.style.width = bar.dataset.width;
    });
  });
  resultCard.dataset.state = "complete";
}

boroughSelect.addEventListener("change", () => {
  updateNeighbourhoodOptions();
  updateCoordinates();
});
neighbourhoodInput.addEventListener("change", updateCoordinates);
neighbourhoodInput.addEventListener("input", updateCoordinates);
updateNeighbourhoodOptions();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  for (const field of [
    "latitude",
    "longitude",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "calculated_host_listings_count",
    "availability_365",
  ]) {
    values[field] = Number(values[field]);
  }

  setLoading(true);
  resultCard.dataset.state = "loading";

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();

    if (!response.ok) {
      const detail = Array.isArray(data.detail)
        ? data.detail.map((issue) => issue.msg).join(" ")
        : data.detail;
      throw new Error(detail || `Request failed (${response.status}).`);
    }

    showPrediction(data, values);
  } catch (error) {
    showError(
      error instanceof TypeError
        ? "The prediction service is unreachable. Start the app with uvicorn and try again."
        : error.message,
    );
    resultCard.dataset.state = "error";
  } finally {
    setLoading(false);
  }
});
