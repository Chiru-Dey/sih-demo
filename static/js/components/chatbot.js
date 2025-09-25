// Chatbot Component JavaScript

// Voice Assistant Settings
let isVoiceInputActive = false;
let isVoiceOutputEnabled = false;
const voiceCommands = {
    'stop speaking': () => stopSpeaking(),
    'pause speaking': () => pauseSpeaking(),
    'resume speaking': () => resumeSpeaking(),
    'clear chat': (type) => clearChat(type)
};

// Save chat history to localStorage
function saveChatHistory(type) {
    const messagesContainer = document.getElementById(`${type}-messages`);
    const messages = messagesContainer.querySelectorAll('.message');
    const history = [];
    messages.forEach(msg => {
        if (!msg.classList.contains('typing') && !msg.classList.contains('typing-indicator')) {
            let messageType = 'bot';
            if (msg.classList.contains('user')) {
                messageType = 'user';
            } else if (msg.classList.contains('system')) {
                messageType = 'system';
            }
            history.push({
                type: messageType,
                text: msg.textContent
            });
        }
    });
    localStorage.setItem(`chatHistory-${type}`, JSON.stringify(history));
}

// Load chat history from localStorage
function loadChatHistory(type) {
    const historyJSON = localStorage.getItem(`chatHistory-${type}`);
    if (historyJSON) {
        const history = JSON.parse(historyJSON);
        const messagesContainer = document.getElementById(`${type}-messages`);
        messagesContainer.innerHTML = ''; // Clear default messages
        history.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.type}`;
            messageEl.textContent = msg.text;
            messagesContainer.appendChild(messageEl);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Backend AI Chat Function
// Add voice input handling
window.startVoiceInput = function(type) {
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
};

function setupVoiceInput(type) {
    if (!speechRecognition) {
        showNotification('Voice input is not supported in your browser', 'warning');
        return;
    }

    const input = document.getElementById(`${type}-input`);
    const voiceButton = document.querySelector(`#${type}-chatbot .voice-input-btn`);

    if (!voiceButton) return;

    voiceButton.addEventListener('click', () => {
        if (!isVoiceInputActive) {
            startVoiceInput(type);
        } else {
            stopVoiceInput();
        }
    });

    // Configure speech recognition
    speechRecognition.onstart = () => {
        isVoiceInputActive = true;
        voiceButton.classList.add('active');
        showNotification('🎤 Listening... Speak now', 'info');
    };

    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        
        // Check for voice commands
        const lowerTranscript = transcript.toLowerCase();
        for (const [command, action] of Object.entries(voiceCommands)) {
            if (lowerTranscript.includes(command)) {
                action(type);
                return;
            }
        }

        // Auto-send message if it's not a command
        sendMessage(type);
    };

    speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showNotification(`Voice input error: ${event.error}`, 'error');
        stopVoiceInput();
    };

    speechRecognition.onend = () => {
        stopVoiceInput();
    };
}

function stopVoiceInput() {
    if (speechRecognition) {
        speechRecognition.stop();
        isVoiceInputActive = false;
        document.querySelectorAll('.voice-input-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
}

async function sendMessage(type) {
    const input = document.getElementById(`${type}-input`);
    const messagesContainer = document.getElementById(`${type}-messages`);
    const message = input.value.trim();

    if (!message) return;

    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = message;
    messagesContainer.appendChild(userMessage);

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        let response;

        if (type === 'ai' && window.aiAvailable && isOnline) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot typing';
            typingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is thinking...';
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // ✅ Call backend API
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    type: type,
                    language: currentLanguage || 'en'
                })
            });

            messagesContainer.removeChild(typingDiv);

            if (!apiResponse.ok) {
                const error = await apiResponse.json();
                throw new Error(error.error || `HTTP ${apiResponse.status}`);
            }

            const data = await apiResponse.json();
            response = data.response;
            
            // Speak the response if voice output is enabled
            if (isVoiceOutputEnabled && window.speechSynthesis) {
                speakText(response, {
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 1.0
                });
            }

        } else {
            response = getLocalResponse(message, type);
            if (!isOnline) {
                response += ' (Offline mode - Limited responses available)';
            }
            if (!window.aiAvailable && type === 'ai') {
                response = '🤖 AI Assistant is unavailable. Please configure your A4F API key. Meanwhile, here\'s basic help: ' + getLocalResponse(message, type);
            }
        }
        const botMessage = document.createElement('div');
        botMessage.className = type === 'ai' ? 'message bot' : 'message system';
        botMessage.textContent = response;
        messagesContainer.appendChild(botMessage);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Announce new message to screen readers

        saveChatHistory(type);
    } catch (error) {
        console.error('AI Chat Error:', error);

        const typingIndicators = messagesContainer.querySelectorAll('.typing');
        typingIndicators.forEach(indicator => indicator.remove());

        const errorMessage = document.createElement('div');
        errorMessage.className = type === 'ai' ? 'message bot' : 'message system';
        errorMessage.textContent = error.message || 'AI service temporarily unavailable. For emergencies, call 112 immediately.';

        messagesContainer.appendChild(errorMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        saveChatHistory(type);
    }
}

// Local responses for when AI is unavailable
function getLocalResponse(message, type) {
    const lowerMessage = message.toLowerCase();

    const responses = {
        'earthquake': '🏔️ EARTHQUAKE SAFETY: DROP to hands and knees, COVER head and neck, HOLD ON until shaking stops. Stay away from windows and heavy objects.',
        'flood': '🌊 FLOOD SAFETY: Move to higher ground immediately. Never walk or drive through flood water. 6 inches can knock you down, 12 inches can carry away a vehicle.',
        'cyclone': '🌀 CYCLONE SAFETY: Stay indoors, away from windows. Have emergency supplies ready. Follow evacuation orders from authorities.',
        'fire': '🔥 FIRE SAFETY: Stay low, exit quickly. Check doors before opening. Call 101. Have meeting point planned.',
        'emergency contacts': '📞 EMERGENCY NUMBERS: National Emergency (112), Disaster Management (1078), Fire Services (101), Police (100), Ambulance (108).',
        'evacuation': '🚨 EVACUATION: Listen to official instructions, take emergency kit, help elderly/disabled neighbors, stay calm.',
        'supplies': '🎒 EMERGENCY KIT: Water (1 gallon/person/day), non-perishable food, flashlight, batteries, first aid kit, medications, documents.',
        'default': type === 'ai' ?
            '🤖 I can help with disaster preparedness, emergency procedures, and safety guidelines. What specific disaster information do you need?' :
            '🚨 Emergency support is available 24/7. Stay safe and follow official instructions. For immediate help, call 112.'
    };

    if (lowerMessage.includes('earthquake') || lowerMessage.includes('tremor')) return responses.earthquake;
    if (lowerMessage.includes('flood') || lowerMessage.includes('water')) return responses.flood;
    if (lowerMessage.includes('cyclone') || lowerMessage.includes('storm') || lowerMessage.includes('hurricane')) return responses.cyclone;
    if (lowerMessage.includes('fire') || lowerMessage.includes('burn')) return responses.fire;
    if (lowerMessage.includes('contact') || lowerMessage.includes('number') || lowerMessage.includes('call')) return responses['emergency contacts'];
    if (lowerMessage.includes('evacuat') || lowerMessage.includes('leave') || lowerMessage.includes('escape')) return responses.evacuation;
    if (lowerMessage.includes('kit') || lowerMessage.includes('supplies') || lowerMessage.includes('prepare')) return responses.supplies;

    return responses.default;
}

// Enhanced chatbot initialization
function clearChat(type) {
    const messagesContainer = document.getElementById(`${type}-messages`);
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        saveChatHistory(type);
        showNotification('Chat cleared', 'success');
    }
}

function toggleVoiceOutput() {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    const voiceOutputBtn = document.querySelector('.voice-output-btn');
    if (voiceOutputBtn) {
        voiceOutputBtn.classList.toggle('active', isVoiceOutputEnabled);
    }
    showNotification(`Voice output ${isVoiceOutputEnabled ? 'enabled' : 'disabled'}`, 'success');
}

function initChatbots() {
    loadChatHistory('ai');
    loadChatHistory('quick');

    // Initialize voice capabilities for both chatbots
    setupVoiceInput('ai');
    setupVoiceInput('quick');

    // Add voice control buttons to chatbot interface
    document.querySelectorAll('.chatbot-popup').forEach(popup => {
        const inputArea = popup.querySelector('.chatbot-input-area');
        if (!inputArea) return;

        const voiceControls = document.createElement('div');
        voiceControls.className = 'voice-controls';
        voiceControls.innerHTML = `
            <button class="voice-input-btn" title="Voice Input">
                <i class="fas fa-microphone"></i>
            </button>
            <button class="voice-output-btn" title="Voice Output" onclick="toggleVoiceOutput()">
                <i class="fas fa-volume-up"></i>
            </button>
        `;
        inputArea.appendChild(voiceControls);
    });

    // Add voice control styles
    const voiceControlStyles = document.createElement('style');
    voiceControlStyles.textContent = `
        .voice-controls {
            display: flex;
            gap: 8px;
            margin-left: 8px;
        }
        .voice-input-btn, .voice-output-btn {
            background: transparent;
            border: none;
            color: var(--accent);
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        .voice-input-btn:hover, .voice-output-btn:hover {
            background: rgba(89, 120, 243, 0.1);
        }
        .voice-input-btn.active {
            color: #ff4444;
            animation: pulse 1.5s infinite;
        }
        .voice-output-btn.active {
            color: #00C851;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(voiceControlStyles);

    // Add message timestamps
    function addTimestamp(messageElement) {
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        messageElement.setAttribute('data-timestamp', timestamp);
        messageElement.title = `Sent at ${timestamp}`;
    }

    // Enhance message creation
    const originalSendMessage = window.sendMessage;
    window.sendMessage = async function(type) {
        const result = await originalSendMessage(type);
        
        // Add timestamps to new messages
        const messages = document.querySelectorAll(`#${type}-messages .message:not([data-timestamp])`);
        messages.forEach(addTimestamp);
        
        return result;
    };

    // Add typing indicators for better UX
    function showTypingIndicator(type, show = true) {
        const messagesContainer = document.getElementById(`${type}-messages`);
        const existingIndicator = messagesContainer.querySelector('.typing-indicator');
        
        if (show && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'message bot typing-indicator';
            indicator.innerHTML = `
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            `;
            messagesContainer.appendChild(indicator);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else if (!show && existingIndicator) {
            existingIndicator.remove();
        }
    }

    // Add quick action buttons for common queries
    function addQuickActions(type) {
        const chatbotPopup = document.querySelector(`#${type}-chatbot .chatbot-popup`);
        if (!chatbotPopup || chatbotPopup.querySelector('.quick-actions')) return;

        const quickActions = document.createElement('div');
        quickActions.className = 'quick-actions';
        quickActions.innerHTML = `
            <div style="padding: 10px 20px; border-top: 1px solid rgba(89, 120, 243, 0.2);">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: var(--primary);">Quick Actions:</p>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="quick-action-btn" data-message="What should I do in an earthquake?">Earthquake</button>
                    <button class="quick-action-btn" data-message="How to prepare for floods?">Floods</button>
                    <button class="quick-action-btn" data-message="Emergency contact numbers">Contacts</button>
                    <button class="quick-action-btn" data-message="What to include in emergency kit?">Emergency Kit</button>
                </div>
            </div>
        `;

        const inputArea = chatbotPopup.querySelector('.chatbot-input-area');
        inputArea.parentNode.insertBefore(quickActions, inputArea);

        // Add click handlers for quick actions
        quickActions.addEventListener('click', function(e) {
            if (e.target.classList.contains('quick-action-btn')) {
                const message = e.target.getAttribute('data-message');
                const input = document.getElementById(`${type}-input`);
                input.value = message;
                sendMessage(type);
            }
        });
    }

    // Initialize quick actions for both chatbots
    addQuickActions('ai');
    addQuickActions('quick');

    // Add CSS for quick actions
    const quickActionStyles = document.createElement('style');
    quickActionStyles.textContent = `
        .quick-action-btn {
            background: rgba(89, 120, 243, 0.1);
            border: 1px solid var(--accent);
            color: var(--white);
            padding: 4px 8px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s ease;
        }
        .quick-action-btn:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .typing-dots {
            display: flex;
            gap: 3px;
            align-items: center;
        }
        .typing-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent);
            animation: typing 1.4s infinite ease-in-out;
        }
        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.3;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(quickActionStyles);

    console.log('💬 Chatbot components initialized');
}

// Message export functionality
function exportChatHistory(type) {
    const messages = document.querySelectorAll(`#${type}-messages .message:not(.typing):not(.typing-indicator)`);
    const chatHistory = Array.from(messages).map(msg => {
        const sender = msg.classList.contains('user') ? 'User' : 
                      msg.classList.contains('system') ? 'Emergency Support' : 'AI Assistant';
        const timestamp = msg.getAttribute('data-timestamp') || new Date().toLocaleTimeString();
        return `[${timestamp}] ${sender}: ${msg.textContent}`;
    }).join('\n');

    const blob = new Blob([chatHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-chat-history-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Chat history exported successfully', 'success');
}

// Make readLastMessage globally accessible
window.readLastMessage = function(type) {
    if (!isTextToSpeechEnabled) {
        showNotification('Please enable Text to Speech first', 'info');
        return;
    }

    const messages = document.querySelectorAll(`#${type}-messages .message`);
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        speakText(lastMessage.textContent);
    }
};

// Add context menu for chat messages
function addChatContextMenu() {
    document.addEventListener('contextmenu', function(e) {
        const message = e.target.closest('.message');
        if (message && !message.classList.contains('typing')) {
            e.preventDefault();
            
            // Remove existing context menu
            const existingMenu = document.querySelector('.chat-context-menu');
            if (existingMenu) existingMenu.remove();

            // Create context menu
            const menu = document.createElement('div');
            menu.className = 'chat-context-menu';
            menu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: var(--foreground);
                border: 1px solid var(--accent);
                border-radius: 6px;
                padding: 5px 0;
                z-index: 9999;
                min-width: 120px;
                box-shadow: 0 4px 12px var(--shadow);
            `;

            const copyOption = document.createElement('div');
            copyOption.className = 'context-menu-item';
            copyOption.textContent = 'Copy Message';
            copyOption.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                color: var(--white);
                font-size: 12px;
                transition: background 0.2s ease;
            `;
            copyOption.addEventListener('mouseenter', () => {
                copyOption.style.background = 'var(--accent)';
            });
            copyOption.addEventListener('mouseleave', () => {
                copyOption.style.background = 'transparent';
            });
            copyOption.addEventListener('click', () => {
                navigator.clipboard.writeText(message.textContent);
                showNotification('Message copied to clipboard', 'success');
                menu.remove();
            });

            menu.appendChild(copyOption);
            document.body.appendChild(menu);

            // Remove menu on click outside
            setTimeout(() => {
                document.addEventListener('click', function removeMenu() {
                    menu.remove();
                    document.removeEventListener('click', removeMenu);
                });
            }, 100);
        }
    });
}

// Initialize chatbot enhancements
document.addEventListener('DOMContentLoaded', function() {
    initChatbots();
    addChatContextMenu();
});