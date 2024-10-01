document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('calorieForm');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent form from submitting normally
        
        const caloryLimit = document.getElementById('caloryLimit').value;
        
        fetch('/api/diet-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ calory_limit: caloryLimit })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Received data from API:", data); // Debugging step
            
            if (data.days) {
                const dietPlan = data.days;
                console.log("Diet Plan Days:", dietPlan); // Log the diet plan to ensure it's structured correctly
                
                // Create events from the diet plan
                const calendarEvents = dietPlan.map(day => {
                    const date = new Date(day.day * 1000); // Convert timestamp to Date object
                    return {
                        title: `Meals:\n${day.meals.map(m => `${m.type}: ${m.description}`).join('\n')}\nSnacks:\n${day.snacks.map(s => `${s.type}: ${s.description}`).join('\n')}\nNotes:\n${day.notes}`,
                        start: date,
                        allDay: true, // Makes sure it displays the whole day event
                    };
                });
                
                console.log("Calendar Events:", calendarEvents); // Log the calendar events to make sure they're structured correctly

                // Initialize FullCalendar
                const calendarEl = document.getElementById('calendar');
                const calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    events: calendarEvents,
                    eventContent: function(arg) {
                        return { html: `<div class="fc-event-title">${arg.event.title}</div>` };
                    }
                });

                calendar.render();
            } else {
                console.error("No 'days' key found in API response.");
            }
            
        })
        .catch(error => {
            console.error('Error fetching or processing data:', error);
        });
    });
});