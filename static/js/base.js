// Disaster Management App - Base JavaScript

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;

    const colors = {
        success: '#43d9ad',
        warning: '#f7931e',
        error: '#e25555',
        info: '#5978f3'
    };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Add notification styles to head
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Global variables
let currentLanguage = 'en';
let selectedLanguage = 'en';
let originalTexts = new Map(); // Store original texts for reversion
let speechSynthesis = window.speechSynthesis;
let speechRecognition = null;
let isTextToSpeechEnabled = false;
let isTranslationPanelOpen = false;
let isAccessibilityPanelOpen = false;
let deferredPrompt;
let isOnline = navigator.onLine;
let mapIsReady = false;
 
 window.geminiAvailable = false;
 window.mapsAvailable = false;

// Language mapping
const languageNames = {
    'en': 'English', 'hi': 'Hindi', 'as': 'Assamese', 'bn': 'Bengali',
    'gu': 'Gujarati', 'kn': 'Kannada', 'ks': 'Kashmiri', 'gom': 'Konkani',
    'ml': 'Malayalam', 'mni': 'Manipuri', 'mr': 'Marathi', 'ne': 'Nepali',
    'or': 'Odia', 'pa': 'Punjabi', 'sa': 'Sanskrit', 'sd': 'Sindhi',
    'ta': 'Tamil', 'te': 'Telugu', 'ur': 'Urdu', 'brx': 'Bodo',
    'sat': 'Santhali', 'mai': 'Maithili', 'doi': 'Dogri'
};

// ✅ NEW: Phonetic transliterations for app title "Disastrous"
const appTitleTransliterations = {
    'hi': 'डिज़ास्ट्रस',    // Hindi
    'bn': 'ডিজাস্ট্রাস',    // Bengali
    'ta': 'டிசாஸ்ட்ரஸ்',    // Tamil
    'te': 'డిసాస్ట్రస్',    // Telugu
    'gu': 'ડિઝાસ્ટ્રસ',    // Gujarati
    'kn': 'ಡಿಸಾಸ್ಟ್ರಸ್',   // Kannada
    'ml': 'ഡിസാസ്ട്രസ്',   // Malayalam
    'mr': 'डिझास्ट्रस',    // Marathi
    'pa': 'ਡਿਸਾਸਟਰਸ',     // Punjabi
    'or': 'ଡିସାଷ୍ଟ୍ରସ',    // Odia
    'ur': 'ڈزاسٹرس',       // Urdu
    'as': 'ডিজাষ্ট্ৰাছ'     // Assamese
};

// Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
}

// Google Maps initialization
function initMap() {
    if (!window.mapsAvailable) {
        document.getElementById('map').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                       background: var(--background); color: var(--danger); flex-direction: column; gap: 15px;">
                <i class="fas fa-map-marked-alt" style="font-size: 48px;"></i>
                <h3>Maps API Key Required</h3>
                <p style="text-align: center; opacity: 0.8;">Configure Google Maps API key to view disaster locations</p>
            </div>
        `;
        return;
    }

    try {
        const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 20.5937, lng: 78.9629 },
            zoom: 5,
            styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
        });

        const disasterLocations = [
            { position: { lat: 28.6139, lng: 77.209 }, title: 'Delhi NCR', type: 'Earthquake Alert', icon: '🏔️', severity: 'high' },
            { position: { lat: 22.5726, lng: 88.3639 }, title: 'Kolkata, West Bengal', type: 'Cyclone Alert', icon: '🌀', severity: 'critical' },
            { position: { lat: 26.9124, lng: 75.7873 }, title: 'Jaipur, Rajasthan', type: 'Heatwave Alert', icon: '🔥', severity: 'moderate' },
            { position: { lat: 9.9312, lng: 76.2673 }, title: 'Kochi, Kerala', type: 'Flood Alert', icon: '🌊', severity: 'high' },
            { position: { lat: 13.0827, lng: 80.2707 }, title: 'Chennai, Tamil Nadu', type: 'Cyclone Alert', icon: '🌀', severity: 'high' }
        ];

        disasterLocations.forEach(location => {
            const pinColor = location.severity === 'critical' ? '#e53e3e' :
                location.severity === 'high' ? '#ff6b35' :
                    location.severity === 'moderate' ? '#f7931e' : '#43d9ad';

            const marker = new google.maps.Marker({
                position: location.position,
                map: map,
                title: `${location.type} - ${location.title}`,
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: pinColor,
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px; font-family: Arial; color: #333;">
                        <h3 style="margin: 0 0 8px 0; color: ${pinColor};">${location.icon} ${location.type}</h3>
                        <p style="margin: 0 0 8px 0; font-weight: bold;">${location.title}</p>
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            Severity: <span style="color: ${pinColor}; font-weight: bold; text-transform: uppercase;">${location.severity}</span>
                        </p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open({ anchor: marker, map });
            });
        });

        // Signal that the map is ready
        mapIsReady = true;
        window.dispatchEvent(new CustomEvent('mapReady'));
 
     } catch (error) {
        console.error('Maps initialization error:', error);
        document.getElementById('map').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%;
                       background: var(--background); color: var(--danger); flex-direction: column; gap: 15px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <h3>Maps Load Error</h3>
                <p style="text-align: center; opacity: 0.8;">Unable to load Google Maps. Check your API key.</p>
            </div>
        `;
        // Also signal readiness on failure, so the page doesn't hang
        mapIsReady = true;
        window.dispatchEvent(new CustomEvent('mapReady'));
    }
}

// Navigation Functions
function toggleMenu() {
    const menu = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.menu-overlay');
    const hamburger = document.querySelector('.hamburger i');

    if (!menu || !overlay || !hamburger) {
        console.error('Menu elements not found');
        return;
    }

    const isOpen = menu.classList.contains('active');

    menu.classList.toggle('active');
    overlay.classList.toggle('active');

    hamburger.className = isOpen ? 'fas fa-bars' : 'fas fa-times';
}

// ✅ RE-FIXED: Handle navigation menu clicks to prevent page reload issues
function handleMenuNavigation(event) {
    console.log('handleMenuNavigation triggered');
    const target = event.target.closest('a.menu-item');
    if (!target) {
        console.log('No menu item found');
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const href = target.getAttribute('href');
    console.log(`Navigating to: ${href}`);

    // Show loading state
    showNotification('🧭 Navigating...', 'info');

    // Close the menu
    toggleMenu();

    // Navigate after a short delay to allow the menu to close
    setTimeout(() => {
        window.location.href = href;
    }, 150);
}

function toggleSection(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.fa-chevron-down');

    content.classList.toggle('active');

    if (content.classList.contains('active')) {
        icon.style.transform = 'rotate(180deg)';
    } else {
        icon.style.transform = 'rotate(0deg)';
    }
}

function openAIAssistant() {
    if (!window.aiAvailable) {
        showNotification('AI Assistant requires A4F API key configuration', 'warning');
    }
    document.getElementById('ai-chatbot').classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        document.getElementById('ai-input').focus();
    }, 300);
}

function startQuickChat() {
    document.getElementById('quick-chatbot').classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        document.getElementById('quick-input').focus();
    }, 300);
}

function closeChatbot(chatbotId) {
    document.getElementById(chatbotId).classList.remove('active');
    document.body.style.overflow = 'auto';
}

function makeEmergencyCall() {
    if (confirm('Do you want to call the emergency number 112?')) {
        window.location.href = 'tel:112';
    }
}

// Translation Panel Functions (Missing from base.js)
function toggleTranslationPanel() {
    const panel = document.getElementById('translationPanel');
    isTranslationPanelOpen = !isTranslationPanelOpen;
    panel.classList.toggle('active', isTranslationPanelOpen);
}

function toggleAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    isAccessibilityPanelOpen = !isAccessibilityPanelOpen;
    panel.classList.toggle('active', isAccessibilityPanelOpen);
}

// Event Listeners
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.chatbot-overlay.active');
        if (activeModal) {
            closeChatbot(activeModal.id);
        }

        const activeMenu = document.querySelector('.hamburger-menu.active');
        if (activeMenu) {
            toggleMenu();
        }

        if (isTranslationPanelOpen) {
            toggleTranslationPanel();
        }

        if (isAccessibilityPanelOpen) {
            toggleAccessibilityPanel();
        }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target;
        if (target.classList.contains('chatbot-input')) {
            e.preventDefault();
            const type = target.id.includes('ai') ? 'ai' : 'quick';
            sendMessage(type);
        }
    }
});

// Initialize everything
document.addEventListener('DOMContentLoaded', function () {
    initPWA();

    // ✅ RE-FIXED: More robust event listeners for navigation
    const hamburgerIcon = document.querySelector('.hamburger');
    if (hamburgerIcon) {
        hamburgerIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleMenu();
        });
        console.log('✅ Hamburger icon event listener initialized');
    }

    const navMenu = document.querySelector('.hamburger-menu');
    if (navMenu) {
        navMenu.addEventListener('click', handleMenuNavigation);
        console.log('✅ Navigation menu event handlers initialized');
    }

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function () {
            selectedLanguage = this.value;
        });
    }

    // Initialize revert button visibility
    const revertBtn = document.getElementById('revertBtn');
    if (revertBtn) {
        revertBtn.style.display = currentLanguage === 'en' ? 'none' : 'block';
    }

    const textareas = document.querySelectorAll('.chatbot-input');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    document.querySelectorAll('.chatbot-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                closeChatbot(this.id);
            }
        });
    });

    // Emergency alert rotation
    setInterval(function () {
        const alerts = [
            'CYCLONE ALERT: Heavy rainfall expected in coastal areas of Odisha and West Bengal. Take necessary precautions.',
            'FLOOD WARNING: Water levels rising in Yamuna river. Stay away from riverbanks.',
            'HEATWAVE ALERT: Temperature may reach 45°C in Delhi NCR. Stay hydrated and avoid direct sunlight.',
            'EARTHQUAKE ADVISORY: Minor tremors detected in Himachal Pradesh region. Be prepared for aftershocks.',
            'LANDSLIDE WARNING: Heavy rains in hill stations. Avoid traveling to mountainous areas.'
        ];

        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        const alertElement = document.querySelector('.emergency-alert');
        if (alertElement) {
            alertElement.innerHTML = `<strong>LIVE UPDATE:</strong> ${randomAlert}`;
        }
    }, 30000);

    console.log('🚀 Disaster Management PWA loaded successfully');
    showNotification('🚀 Disaster Management App Ready', 'success');
});