document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("calorieForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form from submitting normally

    const caloryLimit = document.getElementById("caloryLimit").value;

    fetch("/api/diet-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calory_limit: caloryLimit }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("Error: " + data.error); // Show error message to the user
          return;
        }

        if (data.days) {
          const dietPlan = data.days;

          // Log the received diet plan
          console.log("Received diet plan:", dietPlan);

          // Create events for each day
          const calendarEvents = dietPlan.map((day) => {
            const date = new Date(day.day * 1000); // Convert timestamp to Date object

            const meals = day.meals
              .map(
                (meal) => `<strong>${meal.type}:</strong> ${meal.description}`
              )
              .join("<br>");

            const snacks = day.snacks
              .map(
                (snack) =>
                  `<strong>${snack.type}:</strong> ${snack.description}`
              )
              .join("<br>");

            const macros = day.macros
              ? `<strong>Macros:</strong> Protein: ${day.macros.protein}, Carbs: ${day.macros.carbs}, Fats: ${day.macros.fats}`
              : "";

            const notes = day.notes
              ? `<strong>Notes:</strong> ${day.notes}`
              : "";

            return {
              title: "", // No title; we use eventContent for full display
              start: date,
              allDay: true,
              extendedProps: { meals, snacks, macros, notes },
            };
          });

          // Log the generated calendar events
          console.log(
            "Calendar Events:",
            JSON.stringify(calendarEvents, null, 2)
          );

          // Initialize FullCalendar
          const calendarEl = document.getElementById("calendar");
          const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            events: calendarEvents, // Pass in the generated events
            eventContent(arg) {
              let contentHtml = `
                                <div class="fc-event-title">
                                    ${arg.event.extendedProps.meals}<br>
                                    ${arg.event.extendedProps.snacks}<br>
                                    ${arg.event.extendedProps.macros}<br>
                                    ${arg.event.extendedProps.notes}
                                </div>`;
              return { html: contentHtml };
            },
          });

          calendar.render();
        }
      })
      .catch((error) => console.error("Error fetching diet plan:", error));
  });
});
