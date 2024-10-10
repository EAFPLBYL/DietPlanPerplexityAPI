import json
import logging
import re
import requests
from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Configuration for API keys
api_key = os.environ.get('PERPLEXITY_API_KEY')
ipinfo_api_key = os.environ.get('IPINFO_API_KEY')

# Define the LibreTranslate API URL (this should point to your LibreTranslate instance)
libre_translate_url = "http://127.0.0.1:5000/translate"

# Utility function to clean JSON strings
def clean_json_string(json_str):
    """Cleans the JSON string to ensure it is valid."""
    json_str = re.sub(r'//.*', '', json_str)  # Remove single-line comments
    json_str = json_str.replace("'", '"')  # Replace single quotes with double quotes
    json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas
    json_str = re.sub(r',\s*]', ']', json_str)
    json_str = re.sub(r'(\d+)g', r'\1', json_str)  # Remove "g" from macros
    return json_str

# Extract and parse JSON from the API response
def extract_and_parse_json(content):
    """Extracts and parses JSON from the content."""
    json_match = re.search(r'\{.*\}', content, re.DOTALL)
    if not json_match:
        logging.error("No JSON content found in the response.")
        return None

    json_str = json_match.group(0)
    cleaned_json_str = clean_json_string(json_str)
    logging.debug(f"Cleaned JSON: {cleaned_json_str}")

    try:
        parsed_json = json.loads(cleaned_json_str)
        logging.debug(f"Parsed JSON: {parsed_json}")

        if 'days' in parsed_json:
            return parsed_json['days']
        else:
            logging.error("JSON does not contain 'days' key")
            return None

    except json.JSONDecodeError as e:
        logging.error(f"JSON decoding failed: {e}")
        logging.debug(f"Cleaned JSON string: {cleaned_json_str}")
        return None

# Fetch diet plan from Perplexity AI
def get_diet_plan(calory_limit, diet_type):
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
                    "'macros' (an object with numeric values for 'protein', 'carbs', and 'fats'), "
                    "and 'notes' (a string). Do not include any additional text or comments outside this JSON structure."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Create a 7-day {diet_type} diet plan for a daily calorie limit of {calory_limit} calories. "
                    "Each day should include meals, snacks, macros, and notes. Ensure variety in meal contents."
                ),
            },
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
        "frequency_penalty": 1,
    }

    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        logging.debug("API Response: %s", data)

        choice = data['choices'][0]
        content = choice['message']['content']
        
        diet_plan_days = extract_and_parse_json(content)
        return diet_plan_days if diet_plan_days else None

    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

# API endpoint to get diet plan
@app.route('/api/diet-plan', methods=['POST'])
def api_diet_plan():
    """API endpoint to get the diet plan based on calorie limit and diet type."""
    try:
        data = request.json
        logging.debug(f"Request Data: {data}")

        calory_limit = int(data.get('calory_limit')) if data.get('calory_limit') else None
        diet_type = data.get('diet_type')

        if calory_limit is None:
            return jsonify({"error": "Calorie limit not provided."}), 400
        
        if diet_type is None:
            return jsonify({"error": "Diet type not provided."}), 400
        
        diet_plan_days = get_diet_plan(calory_limit, diet_type)
        
        if diet_plan_days:
            return jsonify({"days": diet_plan_days})
        else:
            return jsonify({"error": "Failed to fetch or parse diet plan."}), 500
    
    except Exception as e:
        logging.error(f"Exception occurred: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

# Fetch user location based on IP using ipinfo.io
@app.route('/get-location', methods=['GET'])
def get_location():
    """Fetches the user's location based on IP using ipinfo.io."""
    ip_info_url = f'https://ipinfo.io/json?token={ipinfo_api_key}'
    
    try:
        response = requests.get(ip_info_url)
        response.raise_for_status()
        return jsonify(response.json())
    
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch IP info: {e}")
        return jsonify({"error": "Failed to fetch IP info"}), 500

@app.route('/translate', methods=['POST'])
def translate_text():
    """API endpoint to translate text using LibreTranslate."""
    
    data = request.json
    texts = data.get('q')  # Expecting a list of texts
    target = data.get('target')

    if not texts or not target:
        return jsonify({"error": "Missing required fields."}), 400

    translations = []

    for text in texts:
        try:
            response = requests.post(
                libre_translate_url,
                headers={"Content-Type": "application/json"},
                json={"q": text, "source": "en", "target": target}
            )
            response.raise_for_status()
            
            translated_data = response.json()
            
            if "translatedText" not in translated_data:
                return jsonify({"error": "Translation failed."}), 500
            
            translations.append(translated_data["translatedText"])
        
        except requests.exceptions.RequestException as e:
            logging.error(f"Translation failed for text '{text}': {e}")
            return jsonify({"error": "Translation request failed."}), 500

    return jsonify({"translations": translations})

# API configuration for client-side usage
@app.route('/api/config', methods=['GET'])
def config():
    """Serve the API configuration including the LibreTranslate URL."""
    return jsonify({"libreTranslateAPIUrl": libre_translate_url})

# Render the main page
@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
