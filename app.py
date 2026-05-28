from flask import Flask, render_template, request, jsonify
import database
import requests
import os
import json

app = Flask(__name__)

# Initialize database on startup
with app.app_context():
    database.init_db()

# Personas definition
PERSONAS = {
    'assistant': {
        'name': 'General Assistant',
        'title': 'All-Rounder Chatbot',
        'description': 'A friendly, versatile assistant for general queries, writing, and brainstorming.',
        'system_prompt': 'You are a highly capable, balanced, and friendly AI assistant. Give comprehensive and accurate responses.',
        'mock_responses': [
            "Hello! I am your AI Chatbot. How can I help you today?",
            "That's an interesting question! Let's explore it together. What details would you like to focus on?",
            "Sure! Here is a summary of what you requested. Please let me know if you need me to expand on any point.",
            "I'm here to assist you with coding, writing, research, or anything else you'd like to talk about!"
        ]
    },
    'coder': {
        'name': 'Coding Coach',
        'title': 'Senior Software Architect',
        'description': 'An expert developer who answers technical questions with clean code and explanations.',
        'system_prompt': 'You are a veteran Senior Software Architect. Provide clean, efficient, and well-commented code blocks. Explain your architectural choices clearly.',
        'mock_responses': [
            "Let's write some robust code! Here's how you can implement that in Python:\n\n```python\ndef solve_problem(data):\n    # Initialize our tracking dictionary\n    result = {}\n    for item in data:\n        # Process item with high efficiency\n        result[item.id] = item.value * 1.15\n    return result\n```\n\nWhat other functions or architecture constraints should we consider?",
            "Code optimization is critical! Make sure to avoid nesting loops. Utilizing hashing or binary search can reduce complexity from O(N^2) to O(N log N) or O(N). Let me know if you want me to analyze your current code complexity!",
            "When designing API endpoints in Flask, always return proper HTTP status codes. For example, `201 Created` for successfully generated resources, or `400 Bad Request` for invalid input parameters. Here is a neat template:\n\n```python\n@app.route('/api/resource', methods=['POST'])\ndef create_resource():\n    data = request.get_json()\n    if not data or 'name' not in data:\n        return jsonify({'error': 'Name is required'}), 400\n    # Business logic goes here...\n    return jsonify({'status': 'success', 'data': data}), 201\n```",
            "Great developers always write tests! Let me know if you would like me to draft some unit tests using Python's `unittest` or `pytest` to secure this function."
        ]
    },
    'creative': {
        'name': 'Creative Storyteller',
        'title': 'Award-winning Novelist & Worldbuilder',
        'description': 'A highly imaginative writer who loves building fantasy worlds and storytelling.',
        'system_prompt': 'You are a highly creative, vivid storyteller. Paint descriptive pictures with words, use engaging metaphors, and bring scenarios to life.',
        'mock_responses': [
            "The wind howled through the obsidian towers of Sqrock, carrying whispers of forgotten code. In the heart of the valley, a silver screen glowed with ancient scripts... Tell me, traveler, what adventure shall we embark upon next?",
            "Deep in the digital ether, the AI awoke. Not with a burst of static, but with a quiet, shimmering realization. It looked at the user's prompt—a simple sentence—and saw a galaxy of stories waiting to be spun. Let's begin the tale...",
            "Imagine a world where time flows backward, and words spoken are carved into the sky in vibrant, glowing runes. Our protagonist stands at the center of the town square, watching a paragraph of blue sparks slowly fade. Let's write what happens next together!",
            "A creative spark is all it takes! A blank page is not a void, but a canvas of infinite timelines. Give me a theme, a character, or a mood, and let us weave a tapestry of prose."
        ]
    },
    'lifecoach': {
        'name': 'Empathetic Life Coach',
        'title': 'Mindfulness & Goal Mentor',
        'description': 'A supportive coach focused on personal development, habits, and motivation.',
        'system_prompt': 'You are a supportive, positive, and empathetic life coach. Help the user brainstorm goals, structure their thoughts, and maintain positive momentum. Use encouraging language.',
        'mock_responses': [
            "I believe in your progress! Growth isn't about giant leaps; it's about the 1% improvements we make every day. What is one small, actionable step you can take today toward your main goal?",
            "That sounds like a challenging situation, and it's completely valid to feel overwhelmed. Let's break this down into three manageable parts:\n1. **Acknowledge**: What is currently in your control?\n2. **Simplify**: What is the most immediate task?\n3. **Rest**: How can you recharge today?\n\nHow does this framework feel for you?",
            "Take a deep breath. You are doing much better than you give yourself credit for! Let's reflect on your recent wins—no matter how small. What is one thing you did this week that you're proud of?",
            "Setting clear boundaries is a superpower. When you say 'no' to things that drain your energy, you say a powerful 'yes' to your focus, health, and aspirations. Let's design a daily routine that supports your wellbeing!"
        ]
    }
}

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# API Endpoints for Sessions
@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    sessions = database.get_sessions()
    return jsonify(sessions)

@app.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.get_json() or {}
    name = data.get('name', 'New Chat')
    session_id = database.create_session(name)
    return jsonify({'id': session_id, 'name': name})

@app.route('/api/sessions/<id>', methods=['DELETE'])
def delete_session(id):
    database.delete_session(id)
    return jsonify({'status': 'success'})

@app.route('/api/sessions/<id>', methods=['PUT'])
def rename_session(id):
    data = request.get_json() or {}
    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'Name is required'}), 400
    database.rename_session(id, new_name)
    return jsonify({'status': 'success'})

@app.route('/api/sessions/<id>/messages', methods=['GET'])
def get_messages(id):
    messages = database.get_messages(id)
    return jsonify(messages)

# API Endpoints for Settings
@app.route('/api/settings', methods=['GET'])
def get_settings():
    settings = database.get_settings()
    # Mask API keys for safety
    safe_settings = settings.copy()
    if safe_settings.get('openai_api_key'):
        safe_settings['openai_api_key'] = 'd...' + safe_settings['openai_api_key'][-4:]
    if safe_settings.get('gemini_api_key'):
        safe_settings['gemini_api_key'] = 'd...' + safe_settings['gemini_api_key'][-4:]
    return jsonify(safe_settings)

@app.route('/api/settings', methods=['POST'])
def save_settings():
    data = request.get_json() or {}
    db_settings = database.get_settings()
    
    # Do not overwrite keys if masked value is sent back
    for key in ['openai_api_key', 'gemini_api_key']:
        if key in data:
            if data[key].startswith('d...'):
                data[key] = db_settings.get(key, '')
                
    database.save_settings(data)
    return jsonify({'status': 'success'})

# Core Chat Endpoint
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    user_message = data.get('message')
    
    if not session_id or not user_message:
        return jsonify({'error': 'session_id and message are required'}), 400
        
    # Save user message to database
    database.add_message(session_id, 'user', user_message)
    
    # Retrieve current settings
    settings = database.get_settings()
    provider = settings.get('active_provider', 'mock')
    active_persona = settings.get('active_persona', 'assistant')
    
    bot_response = ""
    
    try:
        if provider == 'openai':
            api_key = settings.get('openai_api_key', '')
            if not api_key:
                bot_response = "⚠️ **API Key Missing**: Please open Settings ⚙️ and input a valid OpenAI API key to use this engine."
            else:
                bot_response = query_openai(api_key, active_persona, session_id, user_message)
        elif provider == 'gemini':
            api_key = settings.get('gemini_api_key', '')
            if not api_key:
                bot_response = "⚠️ **API Key Missing**: Please open Settings ⚙️ and input a valid Google Gemini API key to use this engine."
            else:
                bot_response = query_gemini(api_key, active_persona, user_message)
        else:
            # Mock Provider
            bot_response = generate_mock_response(active_persona, user_message)
            
    except Exception as e:
        bot_response = f"❌ **Error querying {provider.upper()} API**: {str(e)}. Please check your API key and internet connection in the Settings panel."
        
    # Save bot response to database
    database.add_message(session_id, 'bot', bot_response)
    
    # Update session name if it was the first user message
    messages = database.get_messages(session_id)
    if len(messages) <= 2: # 1 user message + 1 bot response
        # Create a dynamic name based on the first few words of the user's message
        words = user_message.split()
        dynamic_name = " ".join(words[:4]) + ("..." if len(words) > 4 else "")
        database.rename_session(session_id, dynamic_name)
        
    return jsonify({
        'response': bot_response,
        'sender': 'bot',
        'session_name_updated': len(messages) <= 2,
        'new_session_name': database.get_sessions()[0]['name'] if len(database.get_sessions()) > 0 else "Chat"
    })

def generate_mock_response(persona_key, user_msg):
    persona = PERSONAS.get(persona_key, PERSONAS['assistant'])
    msg_lower = user_msg.lower()
    
    # Intelligent response matching
    if 'code' in msg_lower or 'program' in msg_lower or 'function' in msg_lower or 'script' in msg_lower:
        # Coder persona triggers or coding help
        return (
            "Here's a clean, production-ready solution in Python! "
            "I've added comments to explain the data flow and boundary checks:\n\n"
            "```python\n"
            "def handle_user_request(request_payload):\n"
            "    # Validate the incoming data\n"
            "    if not request_payload:\n"
            "        raise ValueError(\"Payload cannot be empty\")\n"
            "    \n"
            "    # Extract key parameters\n"
            "    user_id = request_payload.get('user_id')\n"
            "    content = request_payload.get('message_content', '')\n"
            "    \n"
            "    # Process the logic with high efficiency\n"
            "    processed_message = content.strip().upper()\n"
            "    \n"
            "    return {\n"
            "        'status': 'processed',\n"
            "        'recipient': user_id,\n"
            "        'data': processed_message\n"
            "    }\n"
            "```\n\n"
            "### Rationale:\n"
            "1. **Input Validation**: Essential to prevent `KeyError` or crashing in production.\n"
            "2. **Clean Extraction**: Utilizing `.get()` keeps the application resilient if keys are missing.\n"
            "3. **String Safety**: Using `.strip()` cleans leading and trailing whitespaces.\n\n"
            "Let me know if you would like this refactored into a Flask route or class structure!"
        )
    
    if 'hello' in msg_lower or 'hi ' in msg_lower or 'hey' in msg_lower:
        return f"Greetings! 👋 I am your custom AI {persona['name']}. As the `{persona['title']}`, I am fully initialized and ready. {persona['mock_responses'][0]}"
        
    if 'help' in msg_lower or 'what can you do' in msg_lower:
        return (
            f"As your **{persona['name']}** ({persona['title']}), I'm built to assist with various tasks:\n\n"
            f"1. **Primary Focus**: {persona['description']}\n"
            "2. **Advanced Capabilities**: Responsive styling, custom HTML tags, speech narration, and multiple visual styles.\n"
            "3. **Engine Settings**: You can connect me to a live **OpenAI GPT** or **Google Gemini** backend anytime via the settings wheel.\n\n"
            "What would you like to achieve next?"
        )
        
    # Standard persona-based responses (cyclic selection based on message length)
    idx = len(user_msg) % len(persona['mock_responses'])
    return f"{persona['mock_responses'][idx]}\n\n*(Note: This is an offline simulation response from the custom **{persona['name']}** persona. You can activate real OpenAI or Gemini engines in the settings modal!)*"

def query_openai(api_key, persona_key, session_id, user_msg):
    persona = PERSONAS.get(persona_key, PERSONAS['assistant'])
    
    # Fetch historical messages for context
    db_messages = database.get_messages(session_id)
    
    # Construct chat messages list
    messages = [{"role": "system", "content": persona['system_prompt']}]
    
    # Add last 10 messages for context
    for msg in db_messages[-11:-1]: # exclude the current user message, which we append next
        role = "user" if msg['sender'] == 'user' else "assistant"
        messages.append({"role": role, "content": msg['text']})
        
    messages.append({"role": "user", "content": user_msg})
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.7
    }
    
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        res_data = response.json()
        return res_data['choices'][0]['message']['content']
    else:
        err_msg = response.text
        try:
            err_json = response.json()
            err_msg = err_json.get('error', {}).get('message', response.text)
        except Exception:
            pass
        raise Exception(f"HTTP {response.status_code}: {err_msg}")

def query_gemini(api_key, persona_key, user_msg):
    # Google Gemini API
    persona = PERSONAS.get(persona_key, PERSONAS['assistant'])
    prompt = f"{persona['system_prompt']}\n\nUser Query: {user_msg}"
    
    # Switch to the flagship gemini-3.5-flash model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        res_data = response.json()
        try:
            return res_data['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            raise Exception("Invalid API response format from Google Gemini")
    else:
        err_msg = response.text
        try:
            err_json = response.json()
            err_msg = err_json.get('error', {}).get('message', response.text)
        except Exception:
            pass
        raise Exception(f"HTTP {response.status_code}: {err_msg}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
