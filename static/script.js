document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("calorieForm");
  const translateButton = document.getElementById("translateButton");
  const languageSelect = document.getElementById("languageSelect");
  const dietPlanGrid = document.getElementById("dietPlanGrid");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const translationInProgress = document.getElementById(
    "translationInProgress"
  );

  // Check if all necessary elements are present
  if (
    !form ||
    !translateButton ||
    !languageSelect ||
    !dietPlanGrid ||
    !loadingIndicator ||
    !translationInProgress
  ) {
    console.error("One or more elements are missing from the DOM.");
    return;
  }

  // Predefined list of languages for LibreTranslate
  const languages = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    ja: "Japanese",
    ru: "Russian",
    pt: "Portuguese",
    it: "Italian",
    ko: "Korean",
  };

  // Populate the language dropdown
  Object.entries(languages).forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    languageSelect.appendChild(option);
  });

  // Handle form submission for diet plan generation
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const caloryLimit = document.getElementById("caloryLimit").value;
    const dietType = document.getElementById("dietType").value;

    if (!validateInputs(caloryLimit, dietType)) return;

    loadingIndicator.style.display = "block"; // Show loading indicator

    fetch("/api/diet-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calory_limit: caloryLimit, diet_type: dietType }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.error || "Network response was not ok");
          });
        }
        return response.json();
      })
      .then((data) => {
        loadingIndicator.style.display = "none"; // Hide loading indicator
        console.log("API Response:", data); // Log the API response
        if (data.days) {
          renderDietPlan(data.days); // Call function to render diet plan
        } else {
          console.error("No 'days' field in API response.");
          alert("Unexpected API response format.");
        }
      })
      .catch((error) => {
        loadingIndicator.style.display = "none"; // Hide loading indicator
        console.error("Error fetching diet plan:", error);
        alert("Failed to fetch diet plan: " + error.message);
      });
  });

  // Validate form inputs
  function validateInputs(caloryLimit, dietType) {
    if (!caloryLimit || isNaN(caloryLimit) || caloryLimit <= 0) {
      alert("Please enter a valid positive calorie limit.");
      return false;
    }
    if (!dietType) {
      alert("Please select a diet type.");
      return false;
    }
    return true;
  }

  // Render the diet plan
  function renderDietPlan(days) {
    dietPlanGrid.innerHTML = ""; // Clear previous results
    days.forEach((day) => {
      const dayElement = document.createElement("div");
      dayElement.classList.add("day-plan");
      dayElement.innerHTML = `
              <h3>Day ${day.day}</h3>
              <div class="meals">
                  <h4>Meals:</h4>
                  <ul>${day.meals
                    .map((meal) => `<li>${meal.type}: ${meal.description}</li>`)
                    .join("")}</ul>
              </div>
              <div class="snacks">
                  <h4>Snacks:</h4>
                  <ul>${day.snacks
                    .map(
                      (snack) => `<li>${snack.type}: ${snack.description}</li>`
                    )
                    .join("")}</ul>
              </div>
              <div class="macros">
                  <h4>Macros:</h4>
                  <p>Protein: ${day.macros.protein}g</p>
                  <p>Carbs: ${day.macros.carbs}g</p>
                  <p>Fats: ${day.macros.fats}g</p>
              </div>
              <div class="notes">
                  <h4>Notes:</h4>
                  <p>${day.notes || "No additional notes."}</p>
              </div>
          `;
      dietPlanGrid.appendChild(dayElement);
    });
  }

  // Translation handling
  translateButton.addEventListener("click", function () {
    const selectedLanguage = languageSelect.value;
    if (selectedLanguage) {
      const textElements = document.querySelectorAll(
        "h1, h3, h4, p, li, label, button"
      );
      const textsToTranslate = Array.from(textElements).map(
        (el) => el.textContent
      );

      // Disable the button and show translation progress
      translateButton.disabled = true;
      translationInProgress.style.display = "block"; // Show translation in progress

      translateTextBatch(textsToTranslate, selectedLanguage)
        .then((translatedTexts) => {
          translatedTexts.forEach((translatedText, index) => {
            textElements[index].textContent = translatedText; // Update text with translated values
          });
          // Re-enable button and hide the translation progress indicator
          translateButton.disabled = false;
          translationInProgress.style.display = "none"; // Hide translation in progress
        })
        .catch((error) => {
          console.error("Error translating content:", error);
          alert("Translation failed. Please try again.");
          translateButton.disabled = false; // Re-enable the button
          translationInProgress.style.display = "none"; // Hide translation in progress
        });
    } else {
      alert("Please select a language for translation.");
    }
  });

  // Function to translate text in batches using LibreTranslate API
  async function translateTextBatch(texts, targetLanguage) {
    try {
      const response = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texts, target: targetLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Translation API request failed");
      }

      const data = await response.json();
      return data.translations; // Return translated texts
    } catch (error) {
      throw error; // Rethrow error for handling in the main function
    }
  }
});
