// Accessibility Component JavaScript

// Load preferences from backend session data
function loadAccessibilityPreferences() {
    if (window.userPreferences) {
        // Apply font size
        const fontSize = window.userPreferences.fontSize || 16;
        document.body.style.fontSize = fontSize + 'px';
        
        // Update font size buttons
        const fontButtons = document.querySelectorAll('#accessibilityPanel .accessibility-btn[onclick*="changeFontSize"]');
        fontButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes('Normal') && fontSize === 16) btn.classList.add('active');
            if (btn.textContent.includes('Large') && fontSize === 18) btn.classList.add('active');
            if (btn.textContent.includes('Extra Large') && fontSize === 20) btn.classList.add('active');
        });
        
        // Apply high contrast
        if (window.userPreferences.highContrast) {
            document.body.classList.add('high-contrast');
            const contrastBtn = document.querySelector('#accessibilityPanel .accessibility-btn[onclick*="toggleHighContrast"]');
            if (contrastBtn) contrastBtn.classList.add('active');
        }
    }
}

// Save accessibility preferences to backend session
async function saveAccessibilityPreferences(preferences) {
    try {
        const response = await fetch('/api/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });
        
        if (response.ok) {
            console.log('✅ Accessibility preferences saved to backend session');
            // Update local preferences object
            if (window.userPreferences) {
                Object.assign(window.userPreferences, preferences);
            }
        } else {
            console.warn('⚠️ Failed to save accessibility preferences to backend');
        }
    } catch (error) {
        console.error('❌ Error saving accessibility preferences:', error);
    }
}

// Accessibility Functions
function toggleAccessibilityPanel() {
    const panel = document.getElementById('accessibilityPanel');
    isAccessibilityPanelOpen = !isAccessibilityPanelOpen;
    panel.classList.toggle('active', isAccessibilityPanelOpen);
}

function changeFontSize(size) {
    document.body.className = document.body.className.replace(/font-\w+/g, '');
    document.body.classList.add(`font-${size}`);

    // Convert size name to pixel value
    let fontSize = 16;
    if (size === 'large') fontSize = 18;
    if (size === 'extra-large') fontSize = 20;
    
    // Apply font size directly
    document.body.style.fontSize = fontSize + 'px';

    document.querySelectorAll('#accessibilityPanel .accessibility-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Save to backend session
    saveAccessibilityPreferences({ fontSize: fontSize });
    
    showNotification(`Font size changed to ${size}`, 'success');
}

function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    event.target.classList.toggle('active');
    
    const isEnabled = document.body.classList.contains('high-contrast');
    
    // Save to backend session
    saveAccessibilityPreferences({ highContrast: isEnabled });
    
    showNotification(`High contrast mode ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
}

function toggleTextToSpeech() {
    isTextToSpeechEnabled = !isTextToSpeechEnabled;
    event.target.classList.toggle('active', isTextToSpeechEnabled);
    
    showNotification(`Text to speech ${isTextToSpeechEnabled ? 'enabled' : 'disabled'}`, 'success');
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
        showNotification('🎤 Voice input captured', 'success');
    };

    speechRecognition.onerror = function () {
        button.classList.remove('active');
        showNotification('Voice input error. Please try again.', 'error');
    };

    speechRecognition.onend = function () {
        button.classList.remove('active');
    };

    speechRecognition.start();
    showNotification('🎤 Listening... Speak now', 'info');
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

function speakText(text) {
    if (speechSynthesis && isTextToSpeechEnabled) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;

        speechSynthesis.speak(utterance);
        showNotification('🔊 Reading message aloud', 'info');
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
    
    // Load accessibility preferences from backend session
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