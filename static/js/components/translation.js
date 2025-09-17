// Translation Component JavaScript

// Global translation function will be assigned after the main function is defined

// Save user preferences to localStorage
function saveUserPreference(key, value) {
    saveSetting(`app.${key}`, value);
}

// Translation Panel Functions
function toggleTranslationPanel() {
    const panel = document.getElementById('translationPanel');
    isTranslationPanelOpen = !isTranslationPanelOpen;
    panel.classList.toggle('active', isTranslationPanelOpen);
}

function showTranslationLoading() {
    const loading = document.querySelector('.translation-loading');
    if (loading) {
        loading.classList.add('active');
        updateTranslationProgress(10);
    }
}

function hideTranslationLoading() {
    const loading = document.querySelector('.translation-loading');
    if (loading) {
        loading.classList.remove('active');
    }
}

function updateTranslationProgress(percent) {
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function showTranslationSuccess() {
    showNotification('✅ Translation completed successfully!', 'success');
}

function updateUsageDisplay() {
    // No usage limit anymore - hide the usage display
    const usageContainer = document.querySelector('.translation-usage');
    if (usageContainer) {
        usageContainer.style.display = 'none';
    }
}

// ✅ FINAL FIX: Load preferences directly from DOM data attributes
function loadPreferencesFromDOM() {
    const body = document.body;
    window.userPreferences = {
        language: body.dataset.language || 'en',
        fontSize: parseInt(body.dataset.fontSize, 10) || 16,
        highContrast: body.dataset.highContrast === 'true',
        darkMode: body.dataset.darkMode === 'true'
    };
    console.log('✅ Preferences loaded from DOM:', window.userPreferences);
}

// Initialize language select with backend session data
function initLanguageSelect() {
    console.log('🔧 Initializing language select...');

    const select = document.getElementById('languageSelect');
    if (!select) {
        console.error('❌ Language select element not found during initialization');
        return;
    }

    console.log('✅ Language select element found');
    console.log('🔍 User preferences:', window.userPreferences);
    console.log('🤖 AI Available:', window.aiAvailable);

    if (select && window.userPreferences && window.userPreferences.language) {
        select.value = window.userPreferences.language;
        currentLanguage = window.userPreferences.language;
        console.log(`🌐 Language select initialized with: ${currentLanguage}`);

        // ✅ DECOUPLED: This function now only sets up the language selector.
        // Translation restoration is handled by a separate, more reliable event listener.
        if (currentLanguage !== 'en') {
            console.log(`Language is ${currentLanguage}, restoration will be triggered by event.`);
        }
    } else {
        console.log('🌐 Using default language: en');
        currentLanguage = 'en';
        if (select) {
            select.value = 'en';
        }
    }

    // Ensure translate button is properly initialized
    const translateBtn = document.getElementById('translateBtn');
    if (translateBtn) {
        console.log('✅ Translate button found and ready');
        // Make sure the button is enabled
        translateBtn.disabled = false;
    } else {
        console.error('❌ Translate button not found during initialization');
    }
}

// ✅ RE-FIXED: Restore translation from session or localStorage automatically
async function restoreTranslationFromSession() {
    console.log('Attempting to restore translation...');
    const storedLanguage = localStorage.getItem('selectedLanguage') || currentLanguage;
    console.log(`Stored language is: ${storedLanguage}`);

    if (!storedLanguage || storedLanguage === 'en') {
        console.log('🔄 No translation restoration needed - already in English');
        return;
    }

    const targetLanguageName = languageNames[storedLanguage];
    if (!targetLanguageName) {
        console.warn(`❌ Unknown language code: ${storedLanguage}`);
        return;
    }

    console.log(`🔄 Restoring translation to: ${targetLanguageName}`);

    // Set the language select to match stored language
    const select = document.getElementById('languageSelect');
    if (select) {
        select.value = storedLanguage;
        console.log(`Set language select to: ${storedLanguage}`);
    } else {
        console.error('Language select not found during restore');
    }

    // Apply the translation automatically
    try {
        await applyGeminiTranslation();
        console.log(`✅ Translation restored successfully to: ${targetLanguageName}`);
    } catch (error) {
        console.error(`❌ Failed to restore translation:`, error);
        showNotification(`Failed to restore ${targetLanguageName} translation`, 'warning');
    }
}

// ✅ IMPROVED Backend AI Translation Function with robust DOM updates and chunking
async function applyGeminiTranslation() {
    console.log('🚀 Starting translation process...');

    const select = document.getElementById('languageSelect');
    if (!select) {
        console.error('❌ Language select element not found');
        showNotification('Translation interface error - please refresh the page', 'error');
        return;
    }

    const targetLanguage = select.value;
    const targetLanguageName = languageNames[targetLanguage];
    const wasPanelOpen = isTranslationPanelOpen;

    console.log(`🌐 Target language: ${targetLanguage} (${targetLanguageName})`);

    if (targetLanguage === 'en') {
        if (currentLanguage !== 'en' || originalTexts.size > 0) {
            console.log('🔄 Reverting to English...');
            revertToOriginalTexts();
            return;
        } else {
            showNotification('Page is already in English.', 'info');
            return;
        }
    }

    if (!window.aiAvailable) {
        console.warn('⚠️ AI service not available');
        showNotification('AI translation requires API key configuration', 'warning');
        hideTranslationLoading();
        return;
    }

    showTranslationLoading();
    let appliedCount = 0;

    try {
        const elementsToTranslate = collectTranslatableElements();

        if (elementsToTranslate.length === 0) {
            console.log('No elements to translate');
            hideTranslationLoading();
            showNotification('No translatable content found', 'info');
            return;
        }

        console.log(`🔍 Collected ${elementsToTranslate.length} elements for translation`);
        updateTranslationProgress(20);

        if (currentLanguage === 'en') {
            storeOriginalTexts(elementsToTranslate);
        }

        const textsWithIds = elementsToTranslate.map(item => `${item.id}: ${item.text}`);
        const CHARACTER_LIMIT = 9500; // Safety margin for 10,000 char limit

        const chunks = [];
        let currentChunk = [];
        let currentChunkLength = 0;

        for (const line of textsWithIds) {
            if (currentChunkLength + line.length + 1 > CHARACTER_LIMIT) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [line];
                currentChunkLength = line.length;
            } else {
                currentChunk.push(line);
                currentChunkLength += line.length + 1;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
        }

        const totalChunks = chunks.length;
        console.log(`📦 Text split into ${totalChunks} chunks for translation.`);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];
            const chunkNumber = i + 1;

            console.log(`📤 Sending chunk ${chunkNumber}/${totalChunks}...`);
            showTranslationLoading();
            updateTranslationProgress(20 + (chunkNumber / totalChunks) * 65);

            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: chunk,
                    target_language: targetLanguageName
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status} on chunk ${chunkNumber}`);
            }

            const data = await response.json();
            console.log(`📨 Translation response for chunk ${chunkNumber} received`);
            
            appliedCount += applyTranslationsToDOM(data.translated_text, elementsToTranslate);
        }

        updateAppTitle(targetLanguage);

        if (targetLanguage === 'ur' || targetLanguage === 'sd') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }

        currentLanguage = targetLanguage;
        saveUserPreference('language', targetLanguage);
        localStorage.setItem('selectedLanguage', targetLanguage);

        const revertBtn = document.getElementById('revertBtn');
        if (revertBtn) {
            revertBtn.style.display = targetLanguage === 'en' ? 'none' : 'block';
        }

        updateTranslationProgress(100);

        setTimeout(() => {
            hideTranslationLoading();
            showTranslationSuccess();
            showNotification(`✅ Page translated to ${targetLanguageName} (${appliedCount} items updated)`, 'success');
        }, 500);

    } catch (error) {
        console.error('❌ Translation Error:', error);
        hideTranslationLoading();
        showNotification(error.message || 'Translation failed', 'error');
    }
}

// ✅ NEW: Collect translatable elements with unique IDs and validation
function collectTranslatableElements() {
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a, label, td, th, li, option, input[placeholder]');
    const elementsToTranslate = [];

    elements.forEach((element, index) => {
        if (shouldTranslateElement(element)) {
            // Generate unique ID for this element
            const uniqueId = `tr_${Date.now()}_${index}`;
            element.setAttribute('data-translate-id', uniqueId);

            let textToTranslate = '';
            if (element.tagName === 'INPUT' && element.placeholder) {
                textToTranslate = element.placeholder;
            } else {
                textToTranslate = element.textContent.trim();
            }

            if (textToTranslate && textToTranslate.length > 2) {
                // Clean text (remove emojis but preserve meaningful content)
                const cleanText = textToTranslate.replace(/[📞🌪️✅❌🚨⚠️🔥🌊🌀🏔️]/g, '').trim();

                if (cleanText.length > 2) {
                    elementsToTranslate.push({
                        id: uniqueId,
                        element: element,
                        text: cleanText,
                        originalText: textToTranslate,
                        isInput: element.tagName === 'INPUT' && element.placeholder
                    });

                    console.log(`✅ Added: ${element.tagName} - "${cleanText.substring(0, 50)}"`);
                }
            }
        }
    });

    return elementsToTranslate;
}

// ✅ ENHANCED: Better element filtering with selective inclusion of menu and chat elements
function shouldTranslateElement(element) {
    // Skip if marked as no-translate
    if (element.hasAttribute('data-no-translate')) return false;

    // Skip certain classes and IDs
    if (element.classList.contains('contact-number') ||
        element.classList.contains('panel-close') ||
        element.classList.contains('chatbot-close') ||
        element.id === 'map') return false;

    // ✅ NEW: SPECIAL CASES - Allow translation of specific UI elements
    // Allow hamburger menu items (but preserve icons)
    if (element.classList.contains('menu-item')) {
        return hasTranslatableTextContent(element);
    }

    // Allow initial chatbot messages (bot/system messages, not user input)
    if (element.classList.contains('message') &&
        (element.classList.contains('bot') || element.classList.contains('system'))) {
        return hasTranslatableTextContent(element);
    }

    // ✅ NEW: Skip elements with interactive children (buttons, links, inputs)
    // BUT make exceptions for menu items and certain message containers
    if (!element.classList.contains('menu-item') &&
        !element.closest('.hamburger-menu') &&
        element.querySelector('button, a, input, select, textarea, .action-btn, .voice-btn')) {
        return false;
    }

    // ✅ NEW: Skip if element itself is interactive (with exceptions)
    if (element.tagName === 'SELECT' ||
        element.classList.contains('action-btn') ||
        element.classList.contains('voice-btn') ||
        element.classList.contains('accessibility-btn')) {
        return false;
    }

    // Allow links in menu but preserve their structure
    if (element.tagName === 'A' && !element.closest('.hamburger-menu')) {
        return false;
    }

    // Skip if inside certain containers (with exceptions for menu)
    if (element.closest('#map') ||
        element.closest('.translation-panel') ||
        element.closest('.accessibility-panel') ||
        element.closest('.notification') ||
        element.closest('.fixed-actions') ||
        element.closest('.voice-controls')) return false;

    // ✅ MODIFIED: Allow chatbot messages but skip input areas
    if (element.closest('.chatbot-input-area') ||
        element.closest('.chatbot-input-container')) return false;

    const text = element.textContent.trim();

    // Skip empty, very short, or number-only text
    if (!text || text.length < 3 || text.match(/^\d+$/)) return false;

    // Skip emoji-only content
    if (text.match(/^[📞🌪️✅❌🚨⚠️🔥🌊🌀🏔️\s]+$/)) return false;

    // ✅ NEW: Skip if text contains HTML-like content (preserve structure)
    if (text.includes('<') && text.includes('>')) return false;

    return true;
}

// ✅ NEW: Helper function to check if element has meaningful translatable text
function hasTranslatableTextContent(element) {
    const text = element.textContent.trim();
    if (!text || text.length < 3) return false;

    // Check if text is mostly icons/emojis
    const iconPattern = /^[\s]*<i\s+class|^\s*[📞🌪️✅❌🚨⚠️🔥🌊🌀🏔️]/;
    if (iconPattern.test(text)) return false;

    // Look for meaningful text content
    const meaningfulText = text.replace(/[📞🌪️✅❌🚨⚠️🔥🌊🌀🏔️\s]/g, '').replace(/\s+/g, ' ').trim();
    return meaningfulText.length > 2;
}

// ✅ NEW: Robust translation application with comprehensive error handling
function applyTranslationsToDOM(translatedText, elementsData) {
    console.log('🔄 Applying translations to DOM...');

    const translatedLines = translatedText.split('\n').filter(line => line.trim());
    let successCount = 0;
    let errorCount = 0;

    // Create lookup map for faster element access
    const elementMap = new Map();
    elementsData.forEach(item => {
        elementMap.set(item.id, item);
    });

    console.log(`📝 Processing ${translatedLines.length} translated lines`);
    console.log(`🗂️ Element map contains ${elementMap.size} elements`);

    translatedLines.forEach((line, lineIndex) => {
        try {
            // More flexible regex pattern
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
                const elementId = match[1].trim();
                const translation = match[2].trim();
                const elementData = elementMap.get(elementId);

                if (elementData && translation) {
                    // Verify element still exists and is valid
                    const element = elementData.element;
                    if (element && element.isConnected) {
                        const success = updateElementTextSafely(element, translation, elementData.isInput);
                        if (success) {
                            successCount++;
                            console.log(`✅ Updated ${element.tagName}: "${translation.substring(0, 50)}"`);
                        } else {
                            errorCount++;
                            console.warn(`❌ Failed to update ${element.tagName}`);
                        }
                    } else {
                        errorCount++;
                        console.warn(`❌ Element no longer exists: ${elementId}`);
                    }
                } else {
                    errorCount++;
                    console.warn(`❌ No matching element or translation for: ${elementId}`);
                }
            } else {
                // Try fallback parsing for malformed lines
                const fallbackSuccess = handleMalformedTranslationLine(line, elementMap);
                if (fallbackSuccess) {
                    successCount++;
                } else {
                    errorCount++;
                    console.warn(`❌ Could not parse line ${lineIndex}: "${line}"`);
                }
            }
        } catch (error) {
            errorCount++;
            console.error(`❌ Error processing line ${lineIndex}:`, error);
        }
    });

    console.log(`🎯 Translation complete: ${successCount} succeeded, ${errorCount} failed`);

    if (errorCount > 0) {
        console.warn(`⚠️ ${errorCount} translations failed - see console for details`);
    }

    return successCount;
}

// ✅ ENHANCED: Safe element text updating that preserves child elements
function updateElementTextSafely(element, newText, isInput = false) {
    try {
        console.log(`🔄 Updating ${element.tagName} with: "${newText.substring(0, 50)}"`);

        if (isInput || element.tagName === 'INPUT') {
            if (element.placeholder !== undefined) {
                element.placeholder = newText;
                return true;
            } else if (element.value !== undefined) {
                element.value = newText;
                return true;
            }
        }

        // ✅ NEW: Preserve child elements by only replacing text nodes
        if (element.children.length > 0) {
            console.log(`⚠️ Element has ${element.children.length} children - using selective text replacement`);
            return updateTextNodesOnly(element, newText);
        }

        // For elements without children, safe to replace textContent
        const originalText = element.textContent;
        element.textContent = newText;

        // Verify the update worked
        if (element.textContent === newText) {
            console.log(`✅ Successfully updated element`);
            return true;
        } else {
            // Fallback: try innerHTML (but be careful)
            console.warn(`⚠️ textContent update failed, trying innerHTML`);
            element.innerHTML = escapeHtml(newText);
            return element.textContent.includes(newText);
        }

    } catch (error) {
        console.error(`❌ Failed to update element:`, error);
        return false;
    }
}

// ✅ RE-WRITTEN: More robust recursive text node update
function updateTextNodesOnly(element, newText) {
    try {
        let textReplaced = false;

        // Prioritize replacing the largest text node
        let largestTextNode = null;
        let maxLen = 0;

        function findLargestTextNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const len = node.textContent.trim().length;
                if (len > maxLen) {
                    largestTextNode = node;
                    maxLen = len;
                }
            } else {
                for (const child of node.childNodes) {
                    findLargestTextNode(child);
                }
            }
        }

        findLargestTextNode(element);

        if (largestTextNode) {
            largestTextNode.textContent = newText;
            textReplaced = true;
            console.log(`✅ Replaced largest text node in ${element.tagName}`);
            return true;
        } else {
            console.warn(`⚠️ No text nodes found to update in ${element.tagName}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ Recursive text node update failed:`, error);
        return false;
    }
}

// ✅ NEW: Escape HTML to prevent injection
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ✅ NEW: Handle malformed translation lines as fallback
function handleMalformedTranslationLine(line, elementMap) {
    // Try to extract meaningful content even from malformed lines
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < line.length - 1) {
        const possibleId = line.substring(0, colonIndex).trim();
        const possibleTranslation = line.substring(colonIndex + 1).trim();

        if (elementMap.has(possibleId) && possibleTranslation) {
            const elementData = elementMap.get(possibleId);
            if (elementData.element && elementData.element.isConnected) {
                return updateElementTextSafely(elementData.element, possibleTranslation, elementData.isInput);
            }
        }
    }
    return false;
}

// ✅ FIXED: Store original texts for reversion capability
function storeOriginalTexts(elementsData) {
    console.log('💾 Storing original texts for reversion...');
    originalTexts.clear();

    // Store app title
    const appNameElement = document.querySelector('.app-name');
    if (appNameElement) {
        originalTexts.set('app-title', appNameElement.textContent);
    }

    // Store all translatable elements using the provided data
    if (elementsData && elementsData.length > 0) {
        elementsData.forEach(item => {
            if (item.isInput) {
                originalTexts.set(item.id, { type: 'placeholder', text: item.originalText });
            } else {
                originalTexts.set(item.id, { type: 'textContent', text: item.originalText });
            }
        });
    } else {
        // Fallback: collect elements now if not provided
        const elements = collectTranslatableElements();
        elements.forEach(item => {
            if (item.isInput) {
                originalTexts.set(item.id, { type: 'placeholder', text: item.originalText });
            } else {
                originalTexts.set(item.id, { type: 'textContent', text: item.originalText });
            }
        });
    }

    console.log(`💾 Stored ${originalTexts.size} original texts`);
}

// ✅ ENHANCED: Revert to original English texts with improved debugging
function revertToOriginalTexts() {
    console.log('🔄 Reverting to original English texts...');
    console.log(`📊 Original texts stored: ${originalTexts.size} items`);
    showTranslationLoading();

    let revertedCount = 0;
    let errorCount = 0;

    // Revert app title
    const appNameElement = document.querySelector('.app-name');
    if (appNameElement && originalTexts.has('app-title')) {
        appNameElement.textContent = originalTexts.get('app-title');
        revertedCount++;
        console.log('✅ App title reverted');
    }

    // Revert all stored elements
    originalTexts.forEach((data, id) => {
        if (id === 'app-title') return; // Already handled

        const element = document.querySelector(`[data-translate-id="${id}"]`);
        if (element) {
            try {
                if (data.type === 'placeholder') {
                    element.placeholder = data.text;
                    console.log(`✅ Reverted placeholder for ${element.tagName}: "${data.text.substring(0, 30)}"`);
                } else {
                    // Use the safe update function
                    const success = updateElementTextSafely(element, data.text);
                    if (success) {
                        console.log(`✅ Reverted ${element.tagName}: "${data.text.substring(0, 30)}"`);
                    } else {
                        console.warn(`⚠️ Failed to revert ${element.tagName}: "${data.text.substring(0, 30)}"`);
                        errorCount++;
                        return; // Skip to next iteration
                    }
                }
                revertedCount++;
            } catch (error) {
                console.error(`❌ Error reverting element ${id}:`, error);
                errorCount++;
            }
        } else {
            console.warn(`❌ Element not found for ID: ${id}`);
            errorCount++;
        }
    });

    // Remove RTL styling
    document.body.classList.remove('rtl');

    // Update language state
    currentLanguage = 'en';
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = 'en';
    }

    // Save language preference to localStorage
    saveUserPreference('language', 'en');
    localStorage.setItem('selectedLanguage', 'en');

    // Hide revert button when back to English
    const revertBtn = document.getElementById('revertBtn');
    if (revertBtn) {
        revertBtn.style.display = 'none';
    }

    setTimeout(() => {
        hideTranslationLoading();
        const message = errorCount > 0 ?
            `🔄 Reverted to English (${revertedCount} items restored, ${errorCount} errors)` :
            `🔄 Reverted to English (${revertedCount} items restored)`;
        showNotification(message, errorCount > 0 ? 'warning' : 'success');
        console.log(`🔄 Reversion complete: ${revertedCount} succeeded, ${errorCount} errors`);
        if (isTranslationPanelOpen) {
            toggleTranslationPanel();
        }
    }, 300);
}

// ✅ NEW: Update app title with phonetic transliteration
function updateAppTitle(targetLanguage) {
    const appNameElement = document.querySelector('.app-name');
    if (!appNameElement) return;

    const transliteration = appTitleTransliterations[targetLanguage];
    if (transliteration) {
        appNameElement.textContent = transliteration;
        console.log(`📝 App title transliterated to: ${transliteration}`);
    }
}

// Translation loading functions
function showTranslationLoading() {
    const loading = document.getElementById('translationLoading');
    const button = document.getElementById('translateBtn');
    if (loading) {
        loading.classList.add('active');
    }
    if (button) {
        button.disabled = true;
    }
    updateTranslationProgress(10);
}

function hideTranslationLoading() {
    const loading = document.getElementById('translationLoading');
    const button = document.getElementById('translateBtn');
    if (loading) {
        loading.classList.remove('active');
    }
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-robot"></i> Translate with AI';
    }
    updateTranslationProgress(0);
}

function showTranslationSuccess() {
    const button = document.getElementById('translateBtn');
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Translation Complete!';
        button.style.background = 'var(--success)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }
}
// Make translation function globally available after it's defined
window.applyGeminiTranslation = applyGeminiTranslation;
window.revertToOriginalTexts = revertToOriginalTexts;
window.toggleTranslationPanel = toggleTranslationPanel;

console.log('✅ Translation functions made globally available');
// ✅ FINAL FIX: Event-driven translation restoration
// This ensures translation happens only after the DOM is fully stable.

// ✅ FINAL, ROBUST FIX for race condition with timeout
function handlePageLoadTranslation() {
    console.log('🔄 Page loaded. Handling translation restoration...');
    loadPreferencesFromDOM();
    initLanguageSelect();

    const hasMap = !!document.getElementById('map');

    if (hasMap) {
        // Set a timeout as a fallback in case the map API fails to load
        const mapLoadTimeout = setTimeout(() => {
            console.warn('🗺️ Map loading timed out. Proceeding with translation anyway.');
            restoreTranslationFromSession();
        }, 1000); // 1-second timeout

        // Home page logic: check if map is already ready
        if (window.mapIsReady) {
            console.log('🗺️ Map was already ready. Translating now.');
            clearTimeout(mapLoadTimeout); // Cancel the timeout
            restoreTranslationFromSession();
        } else {
            console.log('🗺️ Map not ready yet. Waiting for mapReady event.');
            window.addEventListener('mapReady', function onMapReady() {
                console.log('🗺️ mapReady event received. Translating now.');
                clearTimeout(mapLoadTimeout); // Cancel the timeout
                restoreTranslationFromSession();
                // Clean up the listener to avoid multiple executions
                window.removeEventListener('mapReady', onMapReady);
            });
        }
    } else {
        // Logic for all other pages without a map
        console.log('🗺️ No map on this page. Translating immediately.');
        restoreTranslationFromSession();
    }
}

// Use pageshow for robust back/forward cache handling
window.addEventListener('pageshow', handlePageLoadTranslation);

// Test function to verify translation API
window.testTranslationAPI = async function () {
    console.log('🧪 Testing translation API...');

    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: 'Hello World',
                target_language: 'Hindi'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Translation API test successful:', data);
            showNotification('Translation API is working!', 'success');
            return data;
        } else {
            const error = await response.json();
            console.error('❌ Translation API test failed:', error);
            showNotification('Translation API test failed: ' + error.error, 'error');
            return null;
        }
    } catch (error) {
        console.error('❌ Translation API test error:', error);
        showNotification('Translation API test error: ' + error.message, 'error');
        return null;
    }
};