from flask import Flask, render_template, send_from_directory, jsonify, request, session, redirect, url_for, Response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import time
from dotenv import load_dotenv
import traceback
import re
import datetime
import json

# Load environment variables
load_dotenv()

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

# Enable CORS for API endpoints
CORS(app)


# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///disastrous.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['A4F_API_KEY'] = os.getenv('A4F_API_KEY', 'your-a4f-api-key')
app.config['MAPS_API_KEY'] = os.getenv('MAPS_API_KEY', 'your-maps-api-key')

db = SQLAlchemy(app)

# Database Models
class SOSRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    sender_name = db.Column(db.String(200))
    contact = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')  # pending, handled, closed
    
    def __repr__(self):
        return f'<SOSRequest {self.id}>'

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(80), nullable=False)
    street_address = db.Column(db.String(200))
    area_locality = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    pincode = db.Column(db.String(6))

    def __repr__(self):
        return f'<User {self.email}>'

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

from functools import wraps

def login_required(role="any"):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('authority_login', _external=True))
            if role != "any" and session.get('user_role') != role:
                # Instead of redirecting, maybe show an unauthorized page or flash a message
                return redirect(url_for('authority_login', error="unauthorized", _external=True))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Helper function to get common template context
def get_template_context():
    """Get common context for all templates, ensuring it's always populated."""
    # Ensure session is initialized (should be handled by before_request, but as a fallback)
    if 'user_preferences' not in session:
        initialize_session()

    # Get default user preferences
    preferences = session['user_preferences']
    
    # Add any dynamic preference calculations
    preferences.update({
        'layout': 'comfortable' if preferences.get('font_size', 16) > 14 else 'compact',
        'theme': 'dark' if preferences.get('dark_mode', False) else 'light',
        'media_upload_enabled': True,  # Feature flag for media uploads
        'max_file_sizes': {
            'photo': '5MB',
            'video': '50MB',
            'audio': '10MB'
        }
    })

    # Combine app config and enhanced user preferences for the template
    context = {
        'ai_available': 'true' if openai_client else 'false',
        'maps_key': app.config['MAPS_API_KEY'],
        'user_preferences': preferences,
        'now': datetime.datetime.now(datetime.UTC).timestamp(),
        'features': {
            'media_upload': True,
            'location_services': True,
            'notifications': preferences.get('notifications', True)
        }
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
                'location': 'Bardhaman, West Bengal',
                'impact': 'Heavy rainfall, strong winds up to 120 km/h',
                'action': 'Immediate evacuation from affected areas',
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

@app.route('/rescue', methods=['GET', 'POST'])
def rescue():
    """Serve the rescue services page and handle rescue request submissions"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            # Extract form data
            emergency_type = data.get('emergency_type')
            victim_count = data.get('victim_count')
            street_address = data.get('street_address')
            area_locality = data.get('area_locality')
            city = data.get('city')
            state = data.get('state')
            pincode = data.get('pincode')
            contact = data.get('contact')

            # Validate required fields
            if not emergency_type or not contact:
                return jsonify({
                    'status': 'error',
                    'message': 'Emergency type and contact number are required'
                }), 400

            # Validate PIN code format if provided
            if pincode and not re.match(r'^[0-9]{6}$', pincode):
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid PIN code format'
                }), 400

            # Format complete address
            address_parts = []
            if street_address:
                address_parts.append(street_address)
            if area_locality:
                address_parts.append(area_locality)
            if city:
                address_parts.append(city)
            if state:
                address_parts.append(state)
            if pincode:
                address_parts.append(pincode)
            
            complete_address = ', '.join(filter(None, address_parts))

            # TODO: In a real application, save this data to the database
            # For now, just return success
            return jsonify({
                'status': 'success',
                'message': 'Emergency request submitted successfully',
                'data': {
                    'emergency_type': emergency_type,
                    'victim_count': victim_count,
                    'address': complete_address,
                    'contact': contact
                }
            }), 200

        except Exception as e:
            print(f"Error processing rescue request: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Failed to process rescue request'
            }), 500

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

@app.route('/report', methods=['GET', 'POST'])
def report():
    """Serve the disaster report page and handle report submissions"""
    if request.method == 'POST':
        try:
            # Process form submission
            # In a real app, save the report to database
            
            # Redirect with success message
            return redirect(url_for('report', success=True))
        except Exception as e:
            print(f"Error processing report: {str(e)}")
            # Redirect with error message
            return redirect(url_for('report', error=True, message='Failed to submit report'))
    
    return render_template('report.html', **get_template_context())

@app.route('/favicon.ico')
def favicon():
    """Serve favicon.ico with a 204 No Content response"""
    return '', 204

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

@app.route('/authority-register', methods=['GET', 'POST'])
def authority_register():
    """Serve the authority registration page and handle registration"""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        street_address = request.form.get('street_address')
        area_locality = request.form.get('area_locality')
        city = request.form.get('city')
        state = request.form.get('state')
        pincode = request.form.get('pincode')

        # Validate PIN code format if provided
        if pincode and not re.match(r'^[0-9]{6}$', pincode):
            return render_template('authority_register.html',
                                error='Invalid PIN code format. Must be 6 digits.',
                                **get_template_context())

        user = User.query.filter_by(email=email).first()
        if user:
            return render_template('authority_register.html', error='User already exists', **get_template_context())
            
        new_user = User(
            email=email,
            password=password,
            role='rescue',
            street_address=street_address,
            area_locality=area_locality,
            city=city,
            state=state,
            pincode=pincode
        )
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('authority_login'))
    return render_template('authority_register.html', **get_template_context())

@app.route('/authority-login', methods=['GET', 'POST'])
def authority_login():
    """Serve the authority login page and handle login"""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user and user.password == password:
            session['user_id'] = user.id
            session['user_role'] = user.role
            if user.role == 'admin':
                return redirect(url_for('admin_dashboard'))
            elif user.role == 'rescue':
                return redirect(url_for('rescue_dashboard'))
        else:
            return render_template('authority_login.html', error='Invalid credentials', **get_template_context())
    return render_template('authority_login.html', **get_template_context())

@app.route('/profile')
def profile():
    """Serve the user profile page"""
    context = get_template_context()
    return render_template('profile.html', **context)

@app.route('/rescue/profile')
@login_required(role='rescue')
def rescue_profile():
    """Serve the rescue profile page"""
    try:
        # Get current rescue user
        user = User.query.get(session['user_id'])
        if not user:
            print("[DEBUG] User not found in session")
            return redirect(url_for('authority_login'))

        # Add debug logging for address fields
        print(f"[DEBUG] Loading profile for user {user.email}")
        print(f"[DEBUG] Address fields:")
        print(f"  - street_address: {user.street_address or 'Not set'}")
        print(f"  - area_locality: {user.area_locality or 'Not set'}")
        print(f"  - city: {user.city or 'Not set'}")
        print(f"  - state: {user.state or 'Not set'}")
        print(f"  - pincode: {user.pincode or 'Not set'}")

        # Pass individual address fields to template with proper null handling
        user_data = {
            'email': user.email,
            'street_address': user.street_address or '',
            'area_locality': user.area_locality or '',
            'city': user.city or '',
            'state': user.state or '',
            'pincode': user.pincode or ''
        }

        context = get_template_context()
        context['user'] = user_data
        return render_template('rescue_profile.html', **context)

    except Exception as e:
        print(f"Error loading rescue profile: {str(e)}")
        return redirect(url_for('authority_login'))

@app.route('/logout')
def logout():
    """Handle user logout and redirect to login page"""
    session.pop('user_id', None)
    session.pop('user_role', None)
    return redirect(url_for('authority_login'))

@app.route('/admin-dashboard')
@login_required(role='admin')
def admin_dashboard():
    """Serve the admin dashboard page"""
    context = get_template_context()
    return render_template('admin_dashboard.html', **context)

@app.route('/admin/rescue-management')
@login_required(role='admin')
def admin_rescue_management():
    """Serve the admin rescue management page"""
    try:
        # Fetch rescue personnel from database
        rescue_personnel = User.query.filter_by(role='rescue').all()

        # Calculate resource counts based on the four main categories
        for personnel in rescue_personnel:
            personnel.resource_counts = {
                'hospitals': 5,          # Number of hospitals they manage
                'ambulances': 5,         # Number of ambulance services
                'fire_stations': 3,      # Number of fire stations
                'police_stations': 13    # Number of police stations
            }

        context = get_template_context()
        context['rescue_personnel'] = rescue_personnel
        return render_template('admin/rescue_management.html', **context)
    except Exception as e:
        print(f"Error loading rescue management: {str(e)}")
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/forecasts')
@login_required(role='admin')
def admin_forecasts():
    """Serve the admin forecasts & alerts page"""
    context = get_template_context()
    # Add sample data for initial development
    context['forecast_data'] = {
        'third_party': {
            'trust_score': 95,
            'criticality': 'high',
            'forecasts': []
        },
        'ai_based': {
            'trust_score': 87,
            'criticality': 'medium',
            'forecasts': []
        },
        'crowdsourced': {
            'trust_score': 82,
            'criticality': 'low',
            'forecasts': []
        }
    }
    return render_template('admin/forecasts.html', **context)

@app.route('/rescue/sos-requests')
@login_required(role='rescue')
def sos_requests():
    """Display all SOS requests for rescue personnel"""
    try:
        # Fetch SOS requests from database, ordered by timestamp descending
        sos_requests = SOSRequest.query.order_by(SOSRequest.timestamp.desc()).all()
        return render_template('sos_requests.html', sos_requests=sos_requests, **get_template_context())
    except Exception as e:
        print(f"Error fetching SOS requests: {str(e)}")
        return render_template('sos_requests.html', error='Failed to load SOS requests', **get_template_context())

@app.route('/rescue/sos-requests/<int:id>/status', methods=['POST'])
@login_required(role='rescue')
def update_sos_status(id):
    """Update the status of an SOS request"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status or new_status not in ['pending', 'handled', 'closed']:
            return jsonify({'error': 'Invalid status'}), 400
            
        if broadcast_sos_update(id, new_status):
            return jsonify({'message': 'Status updated successfully'}), 200
        else:
            return jsonify({'error': 'Failed to update status'}), 500
            
    except Exception as e:
        print(f"Error updating SOS request status: {str(e)}")
        return jsonify({'error': 'Failed to update status'}), 500

@app.route('/rescue-dashboard')
@login_required(role='rescue')
def rescue_dashboard():
    """Serve the rescue dashboard page"""
    context = get_template_context()
    return render_template('rescue_dashboard.html', **context)

@app.route('/resources')
@login_required(role='rescue')
def resources():
    """Serve the emergency resources page with critical facilities data"""
    try:
        # In a real app, this would fetch from database
        resources_data = {
            'hospitals': [
                {
                    'name': 'Teresa Memorial Hospital',
                    'location': 'Bamchandaipur 12, Near Anamoy, National Highway 2, Alisha-713103',
                    'features': [
                        {'icon': 'bed', 'text': 'Beds Available'},
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Available'}
                    ],
                    'contact': '07487947073',
                    'type': 'hospital'
                },
                {
                    'name': 'Apollo Nursing Home',
                    'location': 'Khoshbagan, Burdwan, Burdwan HO-713101',
                    'features': [
                        {'icon': 'bed', 'text': '~750 Beds'},
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Available'}
                    ],
                    'contact': '+919933939344, 09051032383',
                    'type': 'hospital'
                },
                {
                    'name': 'Bengal Faith Hospital',
                    'location': 'Beside Rice & Spice Grocery Shop, Near Nababhat More, Health City, Godda, Lakurdi-713102',
                    'features': [
                        {'icon': 'bed', 'text': '150 Beds'},
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Available'}
                    ],
                    'contact': '8016484040',
                    'emergency': '18003131141',
                    'helpline': '8420382000',
                    'type': 'hospital'
                },
                {
                    'name': 'Burdwan Medical College',
                    'location': 'Baburbag, Burdwan-713104',
                    'features': [
                        {'icon': 'bed', 'text': '1200+ Beds'},
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Available'}
                    ],
                    'contact': '(0342) 7962201',
                    'email': ['burdwanmedicalcollege76@gmail.com', 'principalbmc2015@gmail.com'],
                    'type': 'hospital'
                },
                {
                    'name': 'BIMS Hospital',
                    'location': 'Shrachi Renaissance Township, newabhat Bus stand, Purba Bardhaman',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Available'},
                        {'icon': 'ambulance', 'text': '24×7 Ambulance'}
                    ],
                    'contact': '+91 9232146170',
                    'email': ['bimshospital30@gmail.com', 'hospitalbims@gmail.com'],
                    'website': 'bimshospital.in',
                    'type': 'hospital'
                }
            ],
            'ambulances': [
                {
                    'name': 'Alampur Ambulance Services',
                    'location': 'Alampur, Bardhaman - 713141 (Dewandighi, Talit)',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'Emergency Service'}
                    ],
                    'type': 'ambulance'
                },
                {
                    'name': 'Maa Ambulance Services',
                    'location': 'Ground Floor, Burdwan City-713101',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'Emergency Service'}
                    ],
                    'contact': '08460465556',
                    'type': 'ambulance'
                },
                {
                    'name': 'Rajbati Ambulance Services',
                    'location': 'Rajbati, Burdwan Sadar, Keshabganj Chatti-713104',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'Emergency Service'}
                    ],
                    'type': 'ambulance'
                },
                {
                    'name': 'T ICU Ambulance Service',
                    'location': 'Khosbagan, Kolkata, Khosbagan-713101',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'ICU Equipped'}
                    ],
                    'type': 'ambulance'
                },
                {
                    'name': 'New Life Hospital Ambulance Service',
                    'location': 'Saraitikar More (Near Police Fare, GT Road, Golapbag-713104)',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-medical', 'text': 'Emergency Service'}
                    ],
                    'type': 'ambulance'
                }
            ],
            'fire_stations': [
                {
                    'name': 'Main Fire Station, Bardhaman',
                    'location': 'Burdwan Medical College, Bardhaman HO, Bardhaman - 713101',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-monster', 'text': 'Headquarters Fire Station'}
                    ],
                    'contact': '(0342) 2556901',
                    'type': 'fire'
                },
                {
                    'name': 'Burdwan Fire Station, Bajepratappur',
                    'location': 'Bajepratappur, Bardhaman - 713101',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-monster', 'text': 'Fire Service'}
                    ],
                    'contact': '(0342) 2556901',
                    'type': 'fire'
                },
                {
                    'name': 'Burdwan Fire Station, Khagragorh',
                    'location': 'Khagragorh, Bardhaman - 713104',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'truck-monster', 'text': 'Fire Service'}
                    ],
                    'contact': '(0342) 2657901',
                    'type': 'fire'
                }
            ],
            'police_stations': [
                {
                    'name': 'Burdwan PS (Burdwan Sadar)',
                    'location': 'Burdwan',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'contact': ['0342-2664466', '0342-2664467'],
                    'type': 'police'
                },
                {
                    'name': 'Kalna PS',
                    'location': 'Kalna',
                    'contact': '03454-255040',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Katwa PS',
                    'location': 'Katwa',
                    'contact': '03453-255023',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Ausgram PS',
                    'location': 'Ausgram',
                    'contact': '03452-254213',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Purbasthali PS',
                    'location': 'Purbasthali',
                    'contact': '+91-8509920662',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Memari PS',
                    'location': 'Memari',
                    'contact': '0342-2250232',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Madhabdihi PS',
                    'location': 'Madhabdihi',
                    'contact': '03451-251230',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Raina PS',
                    'location': 'Raina',
                    'contact': '03451-260230',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Galsi PS',
                    'location': 'Galsi',
                    'contact': '0342-2450238',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Bhatar PS',
                    'location': 'Bhatar',
                    'contact': '0342-2322223',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Jamalpur PS',
                    'location': 'Jamalpur',
                    'contact': '03451-288225',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Monteswar PS',
                    'location': 'Monteswar',
                    'contact': '0342-2750523',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Nadanghat PS',
                    'location': 'Nadanghat',
                    'contact': '+91-8016256018',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                },
                {
                    'name': 'Khandaghosh PS',
                    'location': 'Khandaghosh',
                    'contact': '03451-262260',
                    'features': [
                        {'icon': 'clock', 'text': '24/7'},
                        {'icon': 'shield', 'text': 'Police Station'}
                    ],
                    'type': 'police'
                }
            ]
        }
        
        context = get_template_context()
        context['resources_data'] = resources_data
        return render_template('resources.html', **context)
        
    except Exception as e:
        print(f"Error loading resources: {str(e)}")
        return render_template('resources.html',
                             error='Failed to load emergency resources',
                             **get_template_context())

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
            'location': 'Bardhaman, West Bengal',
            'message': 'Heavy rainfall, strong winds up to 120 km/h. Immediate evacuation required.',
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

@app.route('/api/sos', methods=['POST'])
def handle_sos():
    """Handle SOS requests and broadcast to rescue personnel"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        message = data.get('message', 'Emergency assistance required')
        contact = data.get('contact', 'Emergency SOS')
        location = data.get('location', '')

        # Create simple SOS request
        sos_request = SOSRequest(
            sender_name=contact,
            contact=contact,
            message=message,
            location=location,
            status='pending'
        )

        db.session.add(sos_request)
        db.session.commit()

        # Broadcast to rescue personnel
        sos_data = {
            'id': sos_request.id,
            'timestamp': sos_request.timestamp.isoformat(),
            'message': message,
            'location': location
        }
        broadcast_sos_update(sos_data, is_emergency=True)

        return jsonify({
            'status': 'success',
            'message': 'SOS alert sent to rescue personnel'
        }), 200

    except Exception as e:
        print(f"Error processing SOS request: {str(e)}")
        return jsonify({'error': 'Failed to send SOS alert'}), 500

@app.route('/api/disaster-locations')
def get_disaster_locations():
    """API endpoint for disaster locations"""

@app.route('/api/admin/rescue-personnel', methods=['GET'])
@login_required(role='admin')
def get_rescue_personnel():
    """API endpoint for fetching rescue personnel data"""
    try:
        rescue_personnel = User.query.filter_by(role='rescue').all()
        personnel_data = []
        
        for person in rescue_personnel:
            # Calculate resource counts (simulated data for now)
            resource_counts = {
                'hospitals': 5,
                'ambulances': 3,
                'fire_stations': 2,
                'police_stations': 4
            }
            
            personnel_data.append({
                'id': person.id,
                'email': person.email,
                'location': {
                    'city': person.city or '',
                    'state': person.state or '',
                    'pincode': person.pincode or ''
                },
                'resource_counts': resource_counts
            })
            
        return jsonify({
            'status': 'success',
            'data': personnel_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching rescue personnel: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch rescue personnel data'
        }), 500

@app.route('/api/admin/resource-categories', methods=['GET'])
@login_required(role='admin')
def get_resource_categories():
    """API endpoint for resource categories and their details"""
    try:
        categories = {
            'hospitals': {
                'name': 'Hospitals',
                'icon': 'hospital',
                'metrics': ['bed_capacity', 'icu_units', 'ambulances']
            },
            'fire_stations': {
                'name': 'Fire Stations',
                'icon': 'fire-truck',
                'metrics': ['vehicles', 'personnel', 'coverage_area']
            },
            'police_stations': {
                'name': 'Police Stations',
                'icon': 'police-badge',
                'metrics': ['vehicles', 'personnel', 'jurisdiction']
            },
            'ambulances': {
                'name': 'Ambulance Services',
                'icon': 'ambulance',
                'metrics': ['vehicles', 'personnel', 'response_time']
            }
        }
        
        return jsonify({
            'status': 'success',
            'data': categories
        }), 200
        
    except Exception as e:
        print(f"Error fetching resource categories: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch resource categories'
        }), 500

@app.route('/api/admin/resource-counts', methods=['POST'])
@login_required(role='admin')
def update_resource_counts():
    """API endpoint for updating resource counts for rescue personnel"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
            
        user_id = data.get('user_id')
        resource_counts = data.get('resource_counts')
        
        if not user_id or not resource_counts:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: user_id or resource_counts'
            }), 400
            
        # Verify user exists and is rescue personnel
        user = User.query.filter_by(id=user_id, role='rescue').first()
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'Invalid user ID or user is not rescue personnel'
            }), 404
            
        # In a real app, this would update the database
        # For now, just return success
        return jsonify({
            'status': 'success',
            'message': 'Resource counts updated successfully',
            'data': {
                'user_id': user_id,
                'resource_counts': resource_counts
            }
        }), 200
        
    except Exception as e:
        print(f"Error updating resource counts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update resource counts'
        }), 500

@app.route('/api/admin/forecasts', methods=['GET'])
@login_required(role='admin')
def get_forecasts():
    """Get all forecasts grouped by source"""
    try:
        # In a real app, this would fetch from database
        forecasts = {
            'third_party': {
                'trust_score': 95,
                'criticality': 'high',
                'forecasts': [
                    {
                        'id': 'TP001',
                        'title': 'Severe Cyclone Warning',
                        'description': 'Category 4 cyclone approaching eastern coastline',
                        'location': 'Bay of Bengal',
                        'timestamp': '2025-09-23T10:00:00Z',
                        'severity': 'high',
                        'source': 'IMD Weather Service'
                    }
                ]
            },
            'ai_based': {
                'trust_score': 87,
                'criticality': 'medium',
                'forecasts': [
                    {
                        'id': 'AI001',
                        'title': 'Potential Flooding Risk',
                        'description': 'ML models predict high flooding probability',
                        'location': 'Yamuna Basin',
                        'timestamp': '2025-09-23T11:30:00Z',
                        'severity': 'medium',
                        'source': 'DisasterPredict AI',
                        'status': 'pending'
                    }
                ]
            },
            'crowdsourced': {
                'trust_score': 82,
                'criticality': 'low',
                'forecasts': [
                    {
                        'id': 'CS001',
                        'title': 'Landslide Warning',
                        'description': 'Multiple reports of ground movement',
                        'location': 'Himalayan Region',
                        'timestamp': '2025-09-23T09:15:00Z',
                        'severity': 'medium',
                        'source': 'Community Reports',
                        'status': 'pending'
                    }
                ]
            }
        }
        return jsonify(forecasts), 200
    except Exception as e:
        print(f"Error fetching forecasts: {str(e)}")
        return jsonify({'error': 'Failed to fetch forecasts'}), 500

@app.route('/api/admin/forecasts/approve', methods=['POST'])
@login_required(role='admin')
def approve_forecasts():
    """Approve selected forecasts"""
    try:
        data = request.get_json()
        if not data or 'forecast_ids' not in data:
            return jsonify({'error': 'No forecast IDs provided'}), 400
            
        forecast_ids = data['forecast_ids']
        # In a real app, this would update database records
        return jsonify({
            'message': f'Successfully approved {len(forecast_ids)} forecasts',
            'approved_ids': forecast_ids
        }), 200
    except Exception as e:
        print(f"Error approving forecasts: {str(e)}")
        return jsonify({'error': 'Failed to approve forecasts'}), 500

@app.route('/api/admin/forecasts/reject', methods=['POST'])
@login_required(role='admin')
def reject_forecasts():
    """Reject selected forecasts"""
    try:
        data = request.get_json()
        if not data or 'forecast_ids' not in data:
            return jsonify({'error': 'No forecast IDs provided'}), 400
            
        forecast_ids = data['forecast_ids']
        # In a real app, this would update database records
        return jsonify({
            'message': f'Successfully rejected {len(forecast_ids)} forecasts',
            'rejected_ids': forecast_ids
        }), 200
    except Exception as e:
        print(f"Error rejecting forecasts: {str(e)}")
        return jsonify({'error': 'Failed to reject forecasts'}), 500
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

# SSE endpoint for SOS updates
@app.route('/sse/sos-updates')
def sos_updates():
    """Server-Sent Events endpoint for real-time SOS request updates"""
    def event_stream():
        app_ctx = None
        try:
            # Create application context
            app_ctx = app.app_context()
            app_ctx.push()
            
            print("[SSE] New client connected")
            
            # Send any stored emergency updates first
            if hasattr(app, 'sos_updates'):
                for update in app.sos_updates:
                    if update.get('is_emergency'):
                        yield f"data: {json.dumps(update)}\n\n"
            
            # Initial connection - send last few SOS requests within app context
            with app.app_context():
                recent_requests = SOSRequest.query.order_by(
                    SOSRequest.timestamp.desc()
                ).limit(5).all()
                
                for request in recent_requests:
                    # Check if this is a high-priority emergency alert
                    is_emergency = request.sender_name == "Emergency SOS" and request.contact == "112"
                    
                    data = {
                        'type': 'sos_update',
                        'data': {
                            'id': request.id,
                            'timestamp': request.timestamp.isoformat(),
                            'sender_name': request.sender_name,
                            'contact': request.contact,
                            'message': request.message,
                            'location': request.location,
                            'status': request.status,
                            'priority': 'high' if is_emergency else 'normal'
                        },
                        'is_emergency': is_emergency
                    }
                    yield f"data: {json.dumps(data)}\n\n"

            # Keep connection alive
            while True:
                # Send heartbeat every 15 seconds (reduced from 30 for better connection reliability)
                try:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    time.sleep(15)  # Reduced interval for more reliable connection maintenance
                except (GeneratorExit, KeyboardInterrupt):
                    print("[SSE] Heartbeat interrupted - cleaning up connection")
                    raise  # Re-raise to trigger cleanup in outer exception handler
                except Exception as e:
                    print(f"[SSE] Heartbeat error: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Heartbeat failure'})}\n\n"
                    break  # Exit the loop on error

        except GeneratorExit:
            # Client disconnected - clean up
            print("[SSE] Client disconnected - cleaning up")
            if app_ctx:
                app_ctx.pop()
        except Exception as e:
            error_msg = str(e)
            print(f"[SSE] Error: {error_msg}")
            print(f"[SSE] Traceback: {traceback.format_exc()}")
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
            if app_ctx:
                app_ctx.pop()
        finally:
            # Ensure context is always cleaned up
            if app_ctx:
                try:
                    app_ctx.pop()
                except Exception as cleanup_error:
                    print(f"[SSE] Cleanup error: {cleanup_error}")

    return Response(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

# Helper function to broadcast SSE update
def broadcast_sos_update(data, is_emergency=False):
    """Broadcast SOS update to connected SSE clients"""
    try:
        # Add emergency flag for high-priority alerts
        broadcast_data = {
            'type': 'sos_update',
            'data': data,
            'is_emergency': is_emergency,
            'timestamp': datetime.datetime.now(datetime.UTC).isoformat()
        }

        # In a production environment, use a proper pub/sub system
        # For now, store in app context for SSE endpoint
        if not hasattr(app, 'sos_updates'):
            app.sos_updates = []
        app.sos_updates.append(broadcast_data)

        # Keep only last 100 updates
        if len(app.sos_updates) > 100:
            app.sos_updates = app.sos_updates[-100:]

        return True
    except Exception as e:
        print(f"Error broadcasting SOS update: {str(e)}")
        return False


# Error handlers
@app.errorhandler(404)
def not_found(error):
    # Ensure user preferences are initialized
    if 'user_preferences' not in session:
        initialize_session()
    return render_template('home.html', **get_template_context()), 404

@app.errorhandler(500)
def internal_error(error):
    # Ensure user preferences are initialized
    if 'user_preferences' not in session:
        initialize_session()
    return render_template('home.html', **get_template_context()), 500

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'a4f_configured': bool(openai_client),
        'maps_configured': app.config['MAPS_API_KEY'] != 'your-maps-api-key',
        'timestamp': '2025-09-14T21:53:00Z'
    })

# Create database and mock users
with app.app_context():
    db.create_all()
    if not User.query.filter_by(email='admin@disastrous.com').first():
        admin_user = User(email='admin@disastrous.com', password='admin', role='admin')
        db.session.add(admin_user)
    if not User.query.filter_by(email='rescue@disastrous.com').first():
        rescue_user = User(
            email='rescue@disastrous.com',
            password='rescue',
            role='rescue',
            city='Bardhaman',
            state='West Bengal',
            pincode='713104'
        )
        db.session.add(rescue_user)
    db.session.commit()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.getenv('FLASK_ENV') == 'development'
    )
