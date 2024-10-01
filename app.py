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
    # Remove comments
    json_str = re.sub(r'//.*', '', json_str)
    # Replace single quotes with double quotes
    json_str = json_str.replace("'", '"')
    # Remove trailing commas
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    # Ensure all keys are quoted
    json_str = re.sub(r'(\w+)(?=\s*:)', r'"\1"', json_str)
    # Replace newline characters within string values
    json_str = re.sub(r'(?<!\\)\\n', r'\\n', json_str)
    return json_str

def extract_and_parse_json(content):
    # Try to find JSON between triple backticks
    json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # If not found, try to find any JSON-like structure
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            logging.error("No JSON content found in the response")
            return None

    cleaned_json_str = clean_json_string(json_str)
    
    try:
        return json.loads(cleaned_json_str)
    except json.JSONDecodeError as e:
        logging.error(f"JSON decoding failed after cleaning: {e}")
        logging.debug(f"Cleaned JSON string: {cleaned_json_str}")
        return None

def get_diet_plan(calory_limit):
    url = "https://api.perplexity.ai/chat/completions"
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [
            {
                "role": "system",
                "content": "Format the response as JSON with each day having the following structure: 'day' (timestamp), 'meals' (list with meal type and description), 'snacks' (list with snack type and description), 'macros' (list of macros with calorie count), and a 'notes' field for any additional details."
            },
            {
                "role": "user",
                "content": f"Create a 7-day diet plan for a daily calorie limit of {calory_limit} calories."
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
        response.raise_for_status()
        data = response.json()
        
        logging.debug("API Response: %s", data)
        
        choice = data['choices'][0]
        content = choice['message']['content']
        
        diet_plan_json = extract_and_parse_json(content)
        if diet_plan_json and 'days' in diet_plan_json:
            return diet_plan_json['days']
        else:
            logging.error("Invalid JSON structure: 'days' key not found")
            logging.debug(f"Parsed JSON: {diet_plan_json}")
    
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {e}")
    except KeyError as e:
        logging.error(f"Key error: {e}")
    
    return None

@app.route('/api/diet-plan', methods=['POST'])
def api_diet_plan():
    calory_limit = request.json.get('calory_limit')
    diet_plan = get_diet_plan(calory_limit)
    if diet_plan:
        return jsonify(diet_plan)
    else:
        return jsonify({"error": "Failed to fetch or parse diet plan. Please try again later."}), 500

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)