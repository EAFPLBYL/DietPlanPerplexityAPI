document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('dietForm');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const caloryLimit = document.getElementById('calory_limit').value;

        fetch('/api/diet-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calory_limit: caloryLimit })
        })
        .then(response => response.json())
        .then(data => {
            const calendarEl = document.getElementById('calendar');
            calendarEl.innerHTML = ''; // Clear previous content
            
            if (data.error) {
                calendarEl.innerHTML = `<p>${data.error}</p>`;
                return;
            }

            data.forEach(day => {
                const dayEl = document.createElement('div');
                dayEl.classList.add('day');
                
                const date = new Date(day.day * 1000); // Convert timestamp to Date object
                
                dayEl.innerHTML = `
                    <h4>${date.toDateString()}</h4>
                    <p><strong>Meals:</strong></p>
                    ${day.meals.map(m => `<p>${m.type}: ${m.description}</p>`).join('')}
                    <p><strong>Snacks:</strong></p>
                    ${day.snacks.map(s => `<p>${s.type}: ${s.description}</p>`).join('')}
                    <p><strong>Macros:</strong> Calories: ${day.macros.calories}, Protein: ${day.macros.protein}, Carbs: ${day.macros.carbs}, Fat: ${day.macros.fat}</p>
                    <p><strong>Notes:</strong> ${day.notes}</p>
                `;

                calendarEl.appendChild(dayEl);
            });
        })
        .catch(error => console.error('Error fetching diet plan:', error));
    });
});