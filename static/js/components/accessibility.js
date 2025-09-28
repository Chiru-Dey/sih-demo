// Accessibility Component JavaScript

// Initialize Web Speech API and Panel State
let speechSynthesis = window.speechSynthesis;
let speechRecognition = null;
let isTextToSpeechEnabled = false;
let isSpeaking = false;
let currentUtterance = null;
let isAccessibilityPanelOpen = false;

// Initialize Speech Recognition if supported
try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
    }
} catch (e) {
    console.warn('Speech Recognition not supported in this browser');
}

// Initialize Speech Synthesis voices
let voices = [];
function loadVoices() {
    voices = speechSynthesis.getVoices();
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Load accessibility preferences from localStorage
function loadAccessibilityPreferences() {
    // Apply font size
    const fontSize = getSetting('app.fontSize', 16);
    document.documentElement.style.fontSize = fontSize + 'px';

    // Apply high contrast
    if (getSetting('app.highContrast', false)) {
        document.body.classList.add('high-contrast');
        const contrastBtn = document.querySelector('#accessibilityPanel .accessibility-btn[onclick*="toggleHighContrast"]');
        if (contrastBtn) contrastBtn.classList.add('active');
    }

    // Apply text-to-speech preference
    isTextToSpeechEnabled = getSetting('app.textToSpeech', false);
    const ttsBtn = document.querySelector('#accessibilityPanel .accessibility-btn[onclick*="toggleTextToSpeech"]');
    if (ttsBtn && isTextToSpeechEnabled) {
        ttsBtn.classList.add('active');
    }

    // Load voices for speech synthesis
    loadVoices();
}

// Save accessibility preferences to localStorage
function saveAccessibilityPreference(key, value) {
    saveSetting(`app.${key}`, value);
}

// Accessibility Functions
function toggleAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    isAccessibilityPanelOpen = !isAccessibilityPanelOpen;
    panel.classList.toggle('active', isAccessibilityPanelOpen);
}

function changeFontSize(size) {
    let fontSize = 16;
    switch (size) {
        case 'small':
            fontSize = 14;
            break;
        case 'medium':
            fontSize = 16;
            break;
        case 'large':
            fontSize = 18;
            break;
        case 'xlarge':
            fontSize = 22;
            break;
    }
    document.documentElement.style.fontSize = fontSize + 'px';

    document.querySelectorAll('#accessibilityPanel .accessibility-btn[onclick*="changeFontSize"]').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    saveAccessibilityPreference('fontSize', fontSize);
}

function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    const isEnabled = document.body.classList.contains('high-contrast');
    event.target.classList.toggle('active', isEnabled);

    saveAccessibilityPreference('highContrast', isEnabled);
    showNotification(`High contrast ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
}

window.toggleTextToSpeech = function(event) {
    isTextToSpeechEnabled = !isTextToSpeechEnabled;
    if (event && event.target) {
        event.target.classList.toggle('active', isTextToSpeechEnabled);
    }
    
    if (!isTextToSpeechEnabled && isSpeaking) {
        stopSpeaking();
    }
    
    saveAccessibilityPreference('textToSpeech', isTextToSpeechEnabled);
    announceToScreenReader(`Text to speech ${isTextToSpeechEnabled ? 'enabled' : 'disabled'}`);
}

function stopSpeaking() {
    if (speechSynthesis && isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        currentUtterance = null;
    }
}

function pauseSpeaking() {
    if (speechSynthesis && isSpeaking) {
        speechSynthesis.pause();
    }
}

function resumeSpeaking() {
    if (speechSynthesis && currentUtterance) {
        speechSynthesis.resume();
    }
}


// Voice Functions
function startVoiceInput(type) {
    if (!speechRecognition) {
        showNotification('Voice input not supported in this browser', 'warning');
        return;
    }

    const button = event.target.closest('.voice-btn');
    button.classList.add('active');

    speechRecognition.lang = 'en-US';
    speechRecognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById(`${type}-input`).value = transcript;
        button.classList.remove('active');
    };

    speechRecognition.onerror = function () {
        button.classList.remove('active');
        showNotification('Voice input error. Please try again.', 'error');
    };

    speechRecognition.onend = function () {
        button.classList.remove('active');
    };

    speechRecognition.start();
}

function readLastMessage(type) {
    if (!isTextToSpeechEnabled) {
        showNotification('Please enable Text to Speech first', 'info');
        return;
    }

    const messages = document.querySelectorAll(`#${type}-messages .message`);
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        speakText(lastMessage.textContent);
    }
}

function speakText(text, options = {}) {
    if (!speechSynthesis || !isTextToSpeechEnabled) {
        showNotification('Text-to-speech is not enabled or supported', 'warning');
        return;
    }

    // Stop any current speech
    stopSpeaking();

    // Create and configure utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default voice (prefer English voices)
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en-'));
    if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
    }

    // Configure speech parameters
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Add event handlers
    utterance.onstart = () => {
        isSpeaking = true;
        currentUtterance = utterance;
    };

    utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        showNotification('Error occurred while speaking', 'error');
        isSpeaking = false;
        currentUtterance = null;
    };

    // Start speaking
    speechSynthesis.speak(utterance);
}

// Function to speak selected text
function speakSelectedText() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        speakText(selectedText);
    } else {
        showNotification('No text selected', 'info');
    }
}


// Keyboard navigation helpers
function enhanceKeyboardNavigation() {
    // Add keyboard navigation for modals
    document.addEventListener('keydown', function(e) {
        // Tab trapping in modals
        if (e.key === 'Tab') {
            const activeModal = document.querySelector('.chatbot-overlay.active');
            if (activeModal) {
                const focusableElements = activeModal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }

        // Space/Enter activation for custom buttons
        if (e.key === ' ' || e.key === 'Enter') {
            const target = e.target;
            if (target.classList.contains('accessibility-btn') || 
                target.classList.contains('section-header') ||
                target.classList.contains('menu-item')) {
                e.preventDefault();
                target.click();
            }
        }
    });
}

// ARIA attributes management
function updateAriaAttributes() {
    // Update ARIA states for panels
    const translationPanel = document.getElementById('translationPanel');
    const accessibilityPanel = document.getElementById('accessibilityPanel');
    
    if (translationPanel) {
        translationPanel.setAttribute('aria-hidden', !isTranslationPanelOpen);
    }
    
    if (accessibilityPanel) {
        accessibilityPanel.setAttribute('aria-hidden', !isAccessibilityPanelOpen);
    }

    // Update ARIA for collapsible sections
    document.querySelectorAll('.section-header').forEach(header => {
        const content = header.nextElementSibling;
        const isExpanded = content.classList.contains('active');
        
        header.setAttribute('aria-expanded', isExpanded);
        header.setAttribute('aria-controls', content.id || 'section-content');
        
        if (!content.id) {
            content.id = `section-content-${Math.random().toString(36).substr(2, 9)}`;
        }
    });

    // Update ARIA for action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (!btn.getAttribute('aria-label')) {
            const icon = btn.querySelector('i');
            if (icon) {
                if (icon.classList.contains('fa-robot')) {
                    btn.setAttribute('aria-label', 'Open AI Assistant');
                } else if (icon.classList.contains('fa-phone')) {
                    btn.setAttribute('aria-label', 'Make Emergency Call');
                } else if (icon.classList.contains('fa-comments')) {
                    btn.setAttribute('aria-label', 'Start Quick Chat');
                }
            }
        }
    });
}

// Screen reader announcements
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Focus management
function manageFocus() {
    // Save focus when opening modals
    let lastFocusedElement = null;
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('ai-assistant') || 
            e.target.closest('.ai-assistant')) {
            lastFocusedElement = e.target;
        } else if (e.target.classList.contains('quick-chat') || 
                   e.target.closest('.quick-chat')) {
            lastFocusedElement = e.target;
        }
    });

    // Restore focus when closing modals
    const originalCloseChatbot = window.closeChatbot;
    window.closeChatbot = function(chatbotId) {
        originalCloseChatbot(chatbotId);
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    };
}

// Color contrast helpers
function checkColorContrast() {
    // This is a simplified check - in production, you'd want a more comprehensive solution
    const style = getComputedStyle(document.body);
    const bgColor = style.backgroundColor;
    const textColor = style.color;
    
    // Basic contrast check logic would go here
    // For now, we'll just ensure high contrast mode is properly applied
    if (document.body.classList.contains('high-contrast')) {
        announceToScreenReader('High contrast mode is active');
    }
}

// Initialize accessibility features
function initAccessibility() {
    enhanceKeyboardNavigation();
    updateAriaAttributes();
    manageFocus();
    
    // Load accessibility preferences from localStorage
    loadAccessibilityPreferences();
    
    // Set up periodic ARIA updates
    setInterval(updateAriaAttributes, 1000);
    
    // Add role attributes where missing
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
        main.setAttribute('role', 'main');
    }
    
    const nav = document.querySelector('.hamburger-menu');
    if (nav && !nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
    }
    
    // Add landmark roles
    const header = document.querySelector('.header');
    if (header && !header.getAttribute('role')) {
        header.setAttribute('role', 'banner');
    }
    
    console.log('♿ Accessibility features initialized with backend session preferences');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAccessibility);