document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("calorieForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form submission

    const caloryLimit = document.getElementById("caloryLimit").value;
    const dietType = document.getElementById("dietType").value; // Get selected diet type

    if (!caloryLimit || !dietType) {
      alert("Please enter a calorie limit and select a diet type.");
      return;
    }

    // Make the POST request to fetch the diet plan
    fetch("/api/diet-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calory_limit: caloryLimit, diet_type: dietType }), // Include diet type
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("Error: " + data.error);
          return;
        }

        if (data.days) {
          const dietPlan = data.days;
          const dietPlanGrid = document.getElementById("dietPlanGrid");
          dietPlanGrid.innerHTML = ""; // Clear previous data

          // Render the diet plan for each day
          dietPlan.forEach((day, index) => {
            const date = new Date(day.day * 1000).toDateString(); // Convert Unix timestamp to date
            const meals = day.meals;
            const snacks = day.snacks;

            const macros = day.macros
              ? `<p><strong>Macros:</strong> Protein: ${day.macros.protein}g, Carbs: ${day.macros.carbs}g, Fats: ${day.macros.fats}g</p>`
              : "";
            const notes = day.notes
              ? `<p><strong>Notes:</strong> ${day.notes}</p>`
              : "";

            // Group meals into their categories (Breakfast, Lunch, Dinner, Snack)
            const mealSections = {
              Breakfast: [],
              Lunch: [],
              Dinner: [],
              Snack: [],
            };

            // Safely push meals into corresponding sections
            meals.forEach((meal) => {
              if (mealSections[meal.type]) {
                mealSections[meal.type].push(`<li>${meal.description}</li>`);
              } else {
                console.warn(`Unknown meal type: ${meal.type}`); // Log unknown meal types for debugging
              }
            });

            // Safely push snacks into Snack section
            snacks.forEach((snack) => {
              if (mealSections["Snack"]) {
                mealSections["Snack"].push(`<li>${snack.description}</li>`);
              } else {
                console.warn("Snack type issue.");
              }
            });

            // Create the HTML for the day's meals and snacks
            const dayContainer = `
              <div class="day-plan">
                <h3>Day ${index + 1}: ${date}</h3>
                <h4>Breakfast</h4>
                <ul>${mealSections.Breakfast.join("")}</ul>
                <h4>Lunch</h4>
                <ul>${mealSections.Lunch.join("")}</ul>
                <h4>Dinner</h4>
                <ul>${mealSections.Dinner.join("")}</ul>
                <h4>Snacks</h4>
                <ul>${mealSections.Snack.join("")}</ul>
                ${macros}
                ${notes}
              </div>
            `;

            // Add the day container to the grid
            dietPlanGrid.innerHTML += dayContainer;
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching diet plan:", error);
        alert("An error occurred while fetching the diet plan.");
      });
  });
});
