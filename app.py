import json
import logging
import re
import requests
from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Configuration
api_key = os.environ.get('PERPLEXITY_API_KEY')

def clean_json_string(json_str):
    """Cleans the JSON string to ensure it is valid."""
    json_str = re.sub(r'//.*', '', json_str)  # Remove single-line comments
    json_str = json_str.replace("'", '"')  # Replace single quotes with double quotes
    json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas
    json_str = re.sub(r',\s*]', ']', json_str)
    return json_str

def extract_and_parse_json(content):
    """Extracts and parses JSON from the content."""
    json_match = re.search(r'\{.*\}', content, re.DOTALL)  # Adjust regex to match JSON objects directly
    if not json_match:
        logging.error("No JSON content found in the response.")
        return None

    json_str = json_match.group(0)  # Use group(0) to capture entire match
    cleaned_json_str = clean_json_string(json_str)

    try:
        parsed_json = json.loads(cleaned_json_str)
        if 'days' in parsed_json:
            return parsed_json['days']
        else:
            logging.error("JSON does not contain 'days' key")
            return None
    except json.JSONDecodeError as e:
        logging.error(f"JSON decoding failed: {e}")
        logging.debug(f"Cleaned JSON string: {cleaned_json_str}")
        return None

def get_diet_plan(calory_limit):
    """Fetches the diet plan from the Perplexity API."""
    url = "https://api.perplexity.ai/chat/completions"
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a diet planner AI. Return a JSON object with a key 'days'. "
                    "'days' should be an array of objects, each containing: "
                    "'day' (a UNIX timestamp), 'meals' (an array of objects with 'type' and 'description'), "
                    "'snacks' (an array of objects with 'type' and 'description'), "
                    "'macros' (an object with keys 'protein', 'carbs', 'fats'), and 'notes' (a string). "
                    "Do not include any additional text or comments outside this JSON structure."
                )
            },
            {
                "role": "user",
                "content": f"Create a 7-day diet plan for a daily calorie limit of {calory_limit} calories. "
                           "Each day should include meals, snacks, macros, and notes."
            }
        ],
        "max_tokens": 5000,
        "temperature": 0.5,
        "top_p": 0.9,
        "return_citations": False,
        "search_domain_filter": ["perplexity.ai"],
        "return_images": False,
        "return_related_questions": False,
        "search_recency_filter": None,
        "top_k": 0,
        "stream": False,
        "presence_penalty": 0,
        "frequency_penalty": 1
    }

    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise an error for bad responses
        data = response.json()
        logging.debug("API Response: %s", data)

        choice = data['choices'][0]
        content = choice['message']['content']

        diet_plan_days = extract_and_parse_json(content)

        if diet_plan_days:
            return diet_plan_days
        else:
            logging.error("Failed to parse 'days' from the JSON response.")
            return None

    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

@app.route('/api/diet-plan', methods=['POST'])
def api_diet_plan():
    """API endpoint to get the diet plan based on calorie limit."""
    try:
        calory_limit = request.json.get('calory_limit')
        
        if calory_limit is None:
            return jsonify({"error": "Calorie limit not provided."}), 400
        
        diet_plan_days = get_diet_plan(calory_limit)
        
        if diet_plan_days:
            return jsonify({"days": diet_plan_days})
        
        else:
            return jsonify({"error": "Failed to fetch or parse diet plan."}), 500
    
    except Exception as e:
        logging.error(f"Exception occurred: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)