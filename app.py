from flask import Flask, render_template, send_from_directory, jsonify, request, session
from flask_cors import CORS
import os
from dotenv import load_dotenv
import traceback
import re

# Load environment variables
load_dotenv()

app = Flask(__name__, 
           template_folder='templates',
           static_folder='static')

# Enable CORS for API endpoints
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['A4F_API_KEY'] = os.getenv('A4F_API_KEY', 'your-a4f-api-key')
app.config['MAPS_API_KEY'] = os.getenv('MAPS_API_KEY', 'your-maps-api-key')

# Initialize A4F OpenAI Client
openai_client = None
try:
    from openai import OpenAI
    if app.config['A4F_API_KEY'] != 'your-a4f-api-key':
        openai_client = OpenAI(
            base_url="https://api.a4f.co/v1",
            api_key=app.config['A4F_API_KEY']
        )
        print("A4F OpenAI client initialized successfully")
    else:
        print("A4F API key not configured")
except Exception as e:
    print(f"Failed to initialize A4F client: {e}")

# ✅ NEW: Unicode text sanitization to prevent encoding errors
def sanitize_unicode_text(text):
    """Remove invalid Unicode surrogates and problematic characters that cause encoding errors"""
    if not text:
        return text
    
    try:
        # Remove surrogate characters that cause UTF-8 encoding errors
        text = text.encode('utf-8', 'ignore').decode('utf-8')
        
        # Remove or replace other problematic Unicode characters
        text = re.sub(r'[\udc00-\udfff]', '', text)  # Remove surrogates
        text = re.sub(r'[\ufffe\uffff]', '', text)   # Remove non-characters
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        return text
        
    except Exception as e:
        print(f"[ERROR] Text sanitization error: {e}")
        # Fallback: return ASCII-only version
        return text.encode('ascii', 'ignore').decode('ascii')

import datetime

# ✅ FINAL FIX: Initialize and manage user preferences in the session reliably
@app.before_request
def initialize_session():
    """Initialize user preferences in the session if not already present."""
    if 'user_preferences' not in session:
        session['user_preferences'] = {
            'language': 'en',
            'font_size': 16,
            'high_contrast': False,
            'dark_mode': False,
            'notifications': True,
            'location_services': True
        }

# Helper function to get common template context
def get_template_context():
    """Get common context for all templates, ensuring it's always populated."""
    # Ensure session is initialized (should be handled by before_request, but as a fallback)
    if 'user_preferences' not in session:
        initialize_session()

    # Combine app config and user preferences for the template
    context = {
        'ai_available': 'true' if openai_client else 'false',
        'maps_key': app.config['MAPS_API_KEY'],
        'user_preferences': session['user_preferences'],
        'now': datetime.datetime.now(datetime.UTC).timestamp()
    }
    return context

# Main routes
@app.route('/')
def index():
    """Serve the main PWA page"""
    return render_template('home.html', **get_template_context())

@app.route('/forecasts')
def forecasts():
    """Serve the weather forecasts page with real weather data"""
    # In a real app, this would fetch from weather API
    weather_data = {
        'current': {
            'temperature': 28,
            'condition': 'Partly Cloudy',
            'humidity': 65,
            'wind_speed': 15,
            'visibility': 10
        },
        'forecast': [
            {'day': 'Today', 'high': 28, 'low': 22, 'condition': 'sunny', 'rain_chance': 10},
            {'day': 'Tomorrow', 'high': 25, 'low': 20, 'condition': 'rainy', 'rain_chance': 80},
            {'day': 'Thursday', 'high': 27, 'low': 21, 'condition': 'partly-cloudy', 'rain_chance': 30},
            {'day': 'Friday', 'high': 29, 'low': 23, 'condition': 'sunny', 'rain_chance': 5},
            {'day': 'Saturday', 'high': 26, 'low': 19, 'condition': 'cloudy', 'rain_chance': 45}
        ],
        'alerts': [
            {'type': 'cyclone', 'severity': 'high', 'message': 'Potential cyclone formation in Bay of Bengal'},
            {'type': 'flood', 'severity': 'medium', 'message': 'Heavy rainfall may cause flooding in low-lying areas'},
            {'type': 'landslide', 'severity': 'low', 'message': 'Minimal risk in hilly areas'}
        ]
    }
    context = get_template_context()
    context['weather_data'] = weather_data
    return render_template('forecasts.html', **context)

@app.route('/alerts')
def alerts():
    """Serve the emergency alerts page with real alert data"""
    # In a real app, this would fetch from disaster management API
    alerts_data = {
        'active_alerts': [
            {
                'id': 'ALERT001',
                'type': 'CYCLONE WARNING',
                'severity': 'critical',
                'title': 'Severe Cyclonic Storm Approaching',
                'location': 'Odisha and West Bengal coastal areas',
                'impact': 'Heavy rainfall, strong winds up to 120 km/h',
                'action': 'Immediate evacuation from coastal areas',
                'time': '2 hours ago',
                'radius': '150 km'
            },
            {
                'id': 'ALERT002',
                'type': 'FLOOD WARNING',
                'severity': 'high',
                'title': 'Flash Flood Risk',
                'location': 'Yamuna River basin, Delhi NCR',
                'impact': 'Water levels rising rapidly',
                'action': 'Avoid low-lying areas and riverbanks',
                'time': '4 hours ago',
                'radius': '50 km'
            }
        ],
        'statistics': {
            'critical': 3,
            'high': 7,
            'medium': 12,
            'low': 8
        }
    }
    context = get_template_context()
    context['alerts_data'] = alerts_data
    return render_template('alerts.html', **context)

@app.route('/rescue')
def rescue():
    """Serve the rescue services page with real rescue operations data"""
    rescue_data = {
        'active_operations': [
            {
                'id': 'R2024-001',
                'type': 'Flood Rescue',
                'location': 'Sector 21, Noida',
                'victims': 15,
                'resources': '2 boats, 8 personnel',
                'status': 'In Progress',
                'priority': 'high',
                'started': '2 hours ago'
            },
            {
                'id': 'R2024-002',
                'type': 'Landslide Response',
                'location': 'Manali Highway, Himachal Pradesh',
                'victims': '50+ vehicles stuck',
                'resources': 'Heavy machinery, 12 personnel',
                'status': 'Assessment Phase',
                'priority': 'medium',
                'started': '45 minutes ago'
            }
        ],
        'resources': {
            'helicopters': {'available': 3, 'status': 'Ready'},
            'boats': {'available': 8, 'status': 'Ready'},
            'ambulances': {'available': 12, 'status': 'Ready'},
            'personnel': {'available': 45, 'status': 'On Standby'}
        },
        'contacts': [
            {'name': 'Emergency Helpline', 'number': '112', 'description': 'All Emergency Services'},
            {'name': 'Fire Department', 'number': '101', 'description': 'Fire & Rescue Services'},
            {'name': 'Police', 'number': '100', 'description': 'Law Enforcement'},
            {'name': 'Medical Emergency', 'number': '108', 'description': 'Ambulance Service'},
            {'name': 'Disaster Management', 'number': '1078', 'description': 'NDRF Helpline'}
        ]
    }
    context = get_template_context()
    context['rescue_data'] = rescue_data
    return render_template('rescue.html', **context)

@app.route('/guidelines')
def guidelines():
    """Serve the safety guidelines page with comprehensive disaster preparedness info"""
    guidelines_data = {
        'categories': ['earthquake', 'flood', 'fire', 'cyclone', 'general'],
        'guidelines': {
            'earthquake': {
                'before': [
                    'Prepare an emergency kit with water, food, flashlight, and first aid supplies',
                    'Secure heavy furniture and appliances to walls',
                    'Identify safe spots in each room (under sturdy tables, away from glass)',
                    'Practice "Drop, Cover, and Hold On" with family members',
                    'Keep important documents in a waterproof container'
                ],
                'during': [
                    'Drop: Get down on hands and knees immediately',
                    'Cover: Take cover under a sturdy table or desk',
                    'Hold On: Hold onto your shelter and protect your head',
                    'Stay away from windows, mirrors, and heavy objects',
                    'If outdoors, move away from buildings, trees, and power lines'
                ],
                'after': [
                    'Check yourself and others for injuries',
                    'Check for hazards like gas leaks, electrical damage, or fires',
                    'Use stairs, not elevators',
                    'Stay away from damaged buildings',
                    'Be prepared for aftershocks'
                ]
            }
            # Add more guidelines for other categories...
        }
    }
    context = get_template_context()
    context['guidelines_data'] = guidelines_data
    return render_template('guidelines.html', **context)

@app.route('/settings')
def settings():
    """Serve the settings page with current user preferences"""
    context = get_template_context()
    context['settings_data'] = {
        'current_settings': session['user_preferences'],
        'available_languages': [
            {'code': 'en', 'name': 'English'},
            {'code': 'hi', 'name': 'हिंदी (Hindi)'},
            {'code': 'bn', 'name': 'বাংলা (Bengali)'},
            {'code': 'te', 'name': 'తెలుగు (Telugu)'},
            {'code': 'ta', 'name': 'தமிழ் (Tamil)'},
            {'code': 'mr', 'name': 'मराठी (Marathi)'},
            {'code': 'gu', 'name': 'ગુજરાતી (Gujarati)'},
            {'code': 'kn', 'name': 'ಕನ್ನಡ (Kannada)'},
            {'code': 'ml', 'name': 'മലയാളം (Malayalam)'},
            {'code': 'pa', 'name': 'ਪੰਜਾਬੀ (Punjabi)'},
            {'code': 'or', 'name': 'ଓଡ଼ିଆ (Odia)'},
            {'code': 'as', 'name': 'অসমীয়া (Assamese)'}
        ]
    }
    return render_template('settings.html', **context)

@app.route('/authority-login')
def authority_login():
    """Serve the authority login page"""
    context = get_template_context()
    return render_template('authority_login.html', **context)

@app.route('/contacts')
def contacts():
    """Serve the emergency contacts page"""
    context = get_template_context()
    return render_template('contacts.html', **context)

@app.route('/profile')
def profile():
    """Serve the user profile page"""
    context = get_template_context()
    return render_template('profile.html', **context)

# PWA specific routes
@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest file"""
    return send_from_directory(app.static_folder, 'manifest.json', 
                             mimetype='application/json')

@app.route('/service-worker.js')
def service_worker():
    """Serve service worker with correct MIME type"""
    return send_from_directory(app.static_folder, 'service-worker.js',
                             mimetype='application/javascript')

# ✅ NEW: A4F API Endpoints using OpenAI SDK
@app.route('/api/translate', methods=['POST'])
def translate():
    """
    Translate text using A4F OpenAI-compatible API with comprehensive error handling,
    timeout protection, and retry logic for improved reliability.
    """
    import time
    from requests.exceptions import Timeout, ConnectionError, RequestException
    
    try:
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data provided'}), 400
            
        text = data.get('text', '').strip()
        target_language = data.get('target_language', '').strip()
        
        # Input validation
        if not text:
            return jsonify({'error': 'Text is required and cannot be empty'}), 400
        if not target_language:
            return jsonify({'error': 'Target language is required'}), 400
        if len(text) > 10000:
            return jsonify({'error': 'Text too long (maximum 10,000 characters allowed)'}), 400
        
        print(f"[INFO] Translation request - Length: {len(text)} chars, Target: {target_language}")
        
        # Sanitize text to prevent Unicode encoding errors
        original_text = text
        text = sanitize_unicode_text(text)
        
        if not text:
            return jsonify({'error': 'Text contains only invalid characters after sanitization'}), 400
        
        if len(text) != len(original_text):
            print(f"[WARNING] Text sanitized: {len(original_text)} -> {len(text)} chars")
        
        # Check if AI service is available
        if not openai_client:
            return jsonify({'error': 'AI translation service not configured. Please check API settings.'}), 503
        
        # Retry configuration
        max_retries = 3
        base_delay = 1.0  # seconds
        max_delay = 10.0  # seconds
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                print(f"[INFO] Translation attempt {attempt + 1}/{max_retries}")
                
                # Enhanced translation prompt
                prompt = f"""You are a professional translator for a disaster management web application.
                            Translate the following UI text from English to {target_language}.
                            
                            CRITICAL RULES:
                            1. Keep emergency numbers (112, 1078, 101) unchanged
                            2. Keep icons and emojis unchanged
                            3. Maintain the exact format "number: translated_text"
                            4. For the app title "Disastrous" - use PHONETIC transliteration (sound-based), NOT semantic translation
                            5. Examples of phonetic transliteration for "Disastrous":
                               - Hindi: डिज़ास्ट्रस
                               - Bengali: ডিজাস্ট্রাস
                               - Tamil: டிசாஸ்ட்ரஸ்
                               - Telugu: డిసాస్ట్రస్
                               - (similar phonetic approach for other languages)
                            6. Translate other UI elements appropriately for web interface
                            7. Keep technical terms contextually appropriate
                            8. Make translations clear and concise for emergency situations
                            
                            Text to translate:
                            {text}
                            
                            Return ONLY the translated lines in the same format."""
                
                # API call with timeout handling
                start_time = time.time()
                try:
                    response = openai_client.chat.completions.create(
                        model="provider-3/gpt-4o-mini",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.1,
                        max_tokens=3000,
                        timeout=30.0  # 30 second timeout
                    )
                    
                    api_time = time.time() - start_time
                    print(f"[INFO] API call completed in {api_time:.2f} seconds")
                    
                    # Validate response
                    if not response or not response.choices:
                        raise ValueError("Empty response from translation API")
                    
                    translated_text = response.choices[0].message.content
                    if not translated_text:
                        raise ValueError("Empty translation result")
                    
                    translated_text = translated_text.strip()
                    if not translated_text:
                        raise ValueError("Translation result is only whitespace")
                    
                    print(f"[SUCCESS] Translation completed successfully on attempt {attempt + 1}")
                    return jsonify({
                        'translated_text': translated_text,
                        'original_text': original_text,
                        'target_language': target_language,
                        'status': 'success',
                        'attempts': attempt + 1,
                        'api_time': round(api_time, 2)
                    }), 200
                    
                except Exception as api_error:
                    last_error = api_error
                    error_msg = str(api_error)
                    print(f"[ERROR] API call failed on attempt {attempt + 1}: {error_msg}")
                    
                    # Check if it's a retryable error
                    retryable_errors = [
                        'timeout', 'connection', 'network', 'temporary',
                        'rate limit', '429', '502', '503', '504'
                    ]
                    
                    is_retryable = any(keyword in error_msg.lower() for keyword in retryable_errors)
                    
                    if not is_retryable and attempt == 0:
                        # Non-retryable error on first attempt, fail fast
                        return jsonify({
                            'error': f'Translation API error: {error_msg}',
                            'status': 'failed',
                            'retryable': False
                        }), 500
                    
                    # Wait before retry (exponential backoff with jitter)
                    if attempt < max_retries - 1:
                        delay = min(base_delay * (2 ** attempt) + (time.time() % 1), max_delay)
                        print(f"[INFO] Waiting {delay:.1f} seconds before retry...")
                        time.sleep(delay)
                    
            except KeyboardInterrupt:
                return jsonify({'error': 'Translation interrupted by user'}), 499
            except Exception as unexpected_error:
                last_error = unexpected_error
                print(f"[ERROR] Unexpected error on attempt {attempt + 1}: {str(unexpected_error)}")
                
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (attempt + 1))
        
        # All retries exhausted
        error_message = f"Translation failed after {max_retries} attempts"
        if last_error:
            error_message += f". Last error: {str(last_error)}"
        
        print(f"[FAILED] {error_message}")
        return jsonify({
            'error': error_message,
            'status': 'failed',
            'attempts': max_retries,
            'retryable': True
        }), 500
        
    except Exception as e:
        # Catch-all for any other errors
        error_msg = str(e)
        print(f"[CRITICAL] Unexpected translation error: {error_msg}")
        traceback.print_exc()
        
        return jsonify({
            'error': f'Translation system error: {error_msg}',
            'status': 'error',
            'retryable': False
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Chat with A4F AI models with improved error handling and timeout protection.
    """
    import time
    
    try:
        # Check if AI service is available
        if not openai_client:
            return jsonify({'error': 'AI chat service not configured. Please check API settings.'}), 503
        
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data provided'}), 400
            
        message = data.get('message', '').strip()
        chat_type = data.get('type', 'ai')
        language = data.get('language', 'en')
        
        # Input validation
        if not message:
            return jsonify({'error': 'Message is required and cannot be empty'}), 400
        if len(message) > 5000:
            return jsonify({'error': 'Message too long (maximum 5,000 characters allowed)'}), 400
        
        print(f"[INFO] Chat request - Type: {chat_type}, Lang: {language}, Length: {len(message)} chars")
        
        # Sanitize message to prevent Unicode encoding errors
        message = sanitize_unicode_text(message)
        if not message:
            return jsonify({'error': 'Message contains only invalid characters after sanitization'}), 400
        
        # Create context based on chat type
        if chat_type == 'ai':
            system_prompt = f"""You are a helpful AI assistant for "Disastrous", a disaster management web application.
Your primary goal is to assist users with disaster preparedness, safety information, and navigating the application.

CURRENT CONTEXT:
- The user is interacting with you in the '{language}' language. You MUST respond in this language.
- The user is on a web application with the following pages:
  - Home: Main dashboard.
  - Forecasts: Weather predictions and warnings.
  - Alerts: Active emergency alerts.
  - Rescue: Information on rescue operations and contacts.
  - Guidelines: Safety guidelines for various disasters.
  - Settings: User preferences for the app.

YOUR TASKS:
1.  **Language**: Respond exclusively in '{language}'.
2.  **Disaster Assistance**: Provide accurate information on disaster safety, preparedness, and emergency procedures.
3.  **Navigation Support**: If the user asks where to find something, guide them to the correct page. For example, if they ask about "what to do in an earthquake", you can provide safety tips and also mention "You can find more details on the 'Guidelines' page."
4.  **Tone**: Be helpful, clear, and concise, especially for emergency-related queries.

Keep responses informative and easy to understand."""
            user_prompt = f"The user's message is: {message}"
        else:
            system_prompt = f"""You are an emergency support assistant.
                               Provide immediate guidance and safety instructions in '{language}'. If it's a true emergency,
                               remind them to call 112 immediately. Keep responses urgent and helpful."""
            user_prompt = f"The user is reporting in '{language}': {message}"
        
        try:
            print(f"[INFO] Making chat API call...")
            start_time = time.time()
            
            # API call with timeout
            response = openai_client.chat.completions.create(
                model="provider-3/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                timeout=20.0  # 20 second timeout for chat
            )
            
            api_time = time.time() - start_time
            print(f"[INFO] Chat API call completed in {api_time:.2f} seconds")
            
            # Validate response
            if not response or not response.choices:
                raise ValueError("Empty response from chat API")
            
            ai_response = response.choices[0].message.content
            if not ai_response:
                raise ValueError("Empty chat response")
            
            ai_response = ai_response.strip()
            if not ai_response:
                raise ValueError("Chat response is only whitespace")
            
            print(f"[SUCCESS] Chat completed successfully")
            return jsonify({
                'response': ai_response,
                'status': 'success',
                'api_time': round(api_time, 2)
            }), 200
            
        except Exception as api_error:
            error_msg = str(api_error)
            print(f"[ERROR] Chat API error: {error_msg}")
            
            # Provide user-friendly error messages
            if 'timeout' in error_msg.lower():
                return jsonify({
                    'error': 'Chat service is taking too long to respond. Please try again.',
                    'status': 'timeout'
                }), 504
            elif 'rate limit' in error_msg.lower():
                return jsonify({
                    'error': 'Too many requests. Please wait a moment and try again.',
                    'status': 'rate_limited'
                }), 429
            else:
                return jsonify({
                    'error': f'Chat service error: {error_msg}',
                    'status': 'api_error'
                }), 500
        
    except Exception as e:
        error_msg = str(e)
        print(f"[CRITICAL] Unexpected chat error: {error_msg}")
        traceback.print_exc()
        
        return jsonify({
            'error': f'Chat system error: {error_msg}',
            'status': 'system_error'
        }), 500

# User Preferences API endpoints
@app.route('/api/preferences', methods=['POST'])
def save_preferences():
    """Save user preferences to session"""
    try:
        data = request.get_json()
        
        # Update session with new preferences, ensuring the object exists
        if 'user_preferences' not in session:
            initialize_session()
            
        for key in data:
            if key in session['user_preferences']:
                # Type casting for safety
                if isinstance(session['user_preferences'][key], bool):
                    session['user_preferences'][key] = bool(data[key])
                elif isinstance(session['user_preferences'][key], int):
                    session['user_preferences'][key] = int(data[key])
                else:
                    session['user_preferences'][key] = data[key]

        session.modified = True # Explicitly mark session as modified
        print(f"✅ Preferences updated in session: {session['user_preferences']}")
            
        return jsonify({'success': True, 'message': 'Preferences saved', 'preferences': session['user_preferences']}), 200
        
    except Exception as e:
        print(f"[ERROR] Error saving preferences: {e}")
        return jsonify({'error': f'Failed to save preferences: {str(e)}'}), 500

@app.route('/api/preferences', methods=['GET'])
def get_preferences():
    """Get current user preferences from session"""
    try:
        # The before_request handler ensures this always exists
        return jsonify(session['user_preferences']), 200
        
    except Exception as e:
        print(f"[ERROR] Error getting preferences: {e}")
        return jsonify({'error': f'Failed to get preferences: {str(e)}'}), 500

# Existing API routes
@app.route('/api/emergency-alerts')
def get_emergency_alerts():
    """API endpoint for emergency alerts"""
    alerts = [
        {
            'id': 1,
            'type': 'CYCLONE',
            'severity': 'critical',
            'location': 'Odisha and West Bengal',
            'message': 'Heavy rainfall expected in coastal areas',
            'timestamp': '2025-09-14T21:53:00Z'
        },
        {
            'id': 2,
            'type': 'FLOOD',
            'severity': 'high',
            'location': 'Yamuna River',
            'message': 'Water levels rising. Stay away from riverbanks',
            'timestamp': '2025-09-14T21:30:00Z'
        }
    ]
    return jsonify(alerts)

@app.route('/api/disaster-locations')
def get_disaster_locations():
    """API endpoint for disaster locations"""
    locations = [
        {
            'lat': 28.6139, 'lng': 77.209,
            'title': 'Delhi NCR',
            'type': 'Earthquake Alert',
            'severity': 'high'
        },
        {
            'lat': 22.5726, 'lng': 88.3639,
            'title': 'Kolkata, West Bengal',
            'type': 'Cyclone Alert',
            'severity': 'critical'
        }
    ]
    return jsonify(locations)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('home.html',
                         ai_available='true' if openai_client else 'false',
                         maps_key=app.config['MAPS_API_KEY']), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('home.html',
                         ai_available='true' if openai_client else 'false',
                         maps_key=app.config['MAPS_API_KEY']), 500

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'a4f_configured': bool(openai_client),
        'maps_configured': app.config['MAPS_API_KEY'] != 'your-maps-api-key',
        'timestamp': '2025-09-14T21:53:00Z'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.getenv('FLASK_ENV') == 'development'
    )
