// Admin Forecasts & Alerts Page JavaScript

// Initialize trust scores functionality
// Application state
const APP_STATE = {
    initialized: false,
    errors: [],
    announcer: null
};

// Helper functions for trust score management
function getTrustLevelDescription(score) {
    if (score >= 90) return 'This is a highly trusted source.';
    if (score >= 70) return 'This is a moderately trusted source.';
    if (score >= 50) return 'This source has average trust level.';
    return 'This source needs verification.';
}

function getAnnouncer() {
    if (!APP_STATE.announcer) {
        APP_STATE.announcer = document.getElementById('trust-score-announcer');
        if (!APP_STATE.announcer) {
            APP_STATE.announcer = document.createElement('div');
            APP_STATE.announcer.setAttribute('aria-live', 'polite');
            APP_STATE.announcer.setAttribute('role', 'status');
            APP_STATE.announcer.className = 'visually-hidden';
            APP_STATE.announcer.id = 'trust-score-announcer';
            document.body.appendChild(APP_STATE.announcer);
        }
    }
    return APP_STATE.announcer;
}

function announceToScreenReader(message) {
    const announcer = getAnnouncer();
    announcer.textContent = message;
}

// Initialize trust score visualization
function initializeTrustScoreElement(element, index) {
    const scoreText = element.textContent.replace('Trust: ', '').replace('%', '');
    const scoreValue = parseInt(scoreText);
    
    if (isNaN(scoreValue)) {
        throw new Error(`Invalid score format for element ${index}`);
    }

    // Set up accessibility attributes
    element.setAttribute('data-score', scoreValue);
    element.setAttribute('role', 'progressbar');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-valuemin', '0');
    element.setAttribute('aria-valuemax', '100');
    element.setAttribute('aria-valuenow', scoreValue);
    element.setAttribute('aria-label', `Trust score: ${scoreValue}%. ${getTrustLevelDescription(scoreValue)}`);

    // Add keyboard interaction
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            announceToScreenReader(`Trust score is ${scoreValue}%. ${getTrustLevelDescription(scoreValue)}`);
        }
    });

    // Create SVG visualization
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'score-circle');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'true'); // Hide from screen readers since we have text

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'score-circle-progress');
    circle.setAttribute('cx', '20');
    circle.setAttribute('cy', '20');
    circle.setAttribute('r', '16');
    circle.setAttribute('stroke-width', '4');

    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    svg.appendChild(circle);
    element.appendChild(svg);

    // Animate initial score
    animateScore(circle, 0, scoreValue, circumference);
}

function initTrustScores() {
    try {
        const trustScoreElements = document.querySelectorAll('.trust-score-pill');
        if (!trustScoreElements.length) {
            console.warn('No trust score elements found');
            return;
        }

        trustScoreElements.forEach((element, index) => {
            try {
                initializeTrustScoreElement(element, index);
            } catch (error) {
                console.error(`Failed to initialize trust score element ${index}:`, error);
            }
        });
    } catch (error) {
        console.error('Error initializing trust scores:', error);
        showToast('Error initializing trust scores. Please refresh the page.', 'error');
    }
}

function initApprovalSystem() {
    document.querySelectorAll('.forecast-card').forEach(card => {
        if (card.classList.contains('third-party')) return;

        const isAISection = card.classList.contains('ai-based');
        const approveBtn = card.querySelector('.btn-approve');
        const rejectBtn = card.querySelector('.btn-reject');
        const checkboxes = card.querySelectorAll('.forecast-checkbox input');
        
        if (approveBtn && rejectBtn) {
            approveBtn.addEventListener('click', () => handleApproval(card, true, isAISection ? 'ai' : 'crowdsourced'));
            rejectBtn.addEventListener('click', () => handleApproval(card, false, isAISection ? 'ai' : 'crowdsourced'));
        }

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    // Uncheck boxes in other sections
                    const currentSection = this.closest('.forecast-card');
                    document.querySelectorAll('.forecast-checkbox input:checked').forEach(cb => {
                        if (!cb.closest('.forecast-card').isEqualNode(currentSection)) {
                            cb.checked = false;
                        }
                    });
                }
                
                const hasSelection = Array.from(checkboxes).some(cb => cb.checked);
                updateButtonStates(card, hasSelection);
            });
        });
    });
}

// Utility function to get selected forecasts
function getSelectedForecasts(card) {
    const selectedForecasts = Array.from(card.querySelectorAll('.forecast-checkbox input:checked'))
        .map(checkbox => checkbox.closest('.forecast-item'));
    
    if (selectedForecasts.length === 0) {
        showToast('Please select at least one forecast', 'warning');
        return null;
    }
    
    return selectedForecasts;
}

// Utility function to animate and remove forecast items
function removeForecastWithAnimation(forecast) {
    const animation = forecast.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.95)', marginTop: '0', marginBottom: '0', padding: '0' },
        { opacity: 0, transform: 'scale(0.9)', height: '0' }
    ], {
        duration: 400,
        easing: 'ease-in-out'
    });

    animation.onfinish = () => {
        forecast.style.display = 'none';
        forecast.remove(); // Actually remove from DOM
    };
}

// Utility function to clear checkbox selections
function clearCheckboxSelections(card) {
    const checkboxes = card.querySelectorAll('.forecast-checkbox input');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.disabled = false;
    });
    updateButtonStates(card, false);
}

async function handleApproval(card, isApproved, forecastType, retryCount = 0) {
    const MAX_RETRIES = 3;
    const loadingClass = `processing-${forecastType}`;

    // Validate no mixed selections
    const allCheckboxes = document.querySelectorAll('.forecast-checkbox input:checked');
    const hasOtherSectionSelected = Array.from(allCheckboxes).some(cb => {
        const checkboxCard = cb.closest('.forecast-card');
        return checkboxCard && !checkboxCard.isEqualNode(card);
    });

    if (hasOtherSectionSelected) {
        showToast('Please only select items from one section at a time', 'warning');
        return;
    }

    const selectedForecasts = getSelectedForecasts(card);
    if (!selectedForecasts) return;
    
    const forecastIds = selectedForecasts.map(forecast => {
        const forecastItem = forecast.closest('.forecast-item');
        return forecastItem.dataset.id || forecast.dataset.forecastId;
    });

    try {
        // Show loading state
        const loadingToast = showToast('Processing...', 'info', false);
        card.classList.add('processing', loadingClass);
        
        const response = await fetch(`/api/admin/forecasts/${forecastType}/${isApproved ? 'approve' : 'reject'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forecast_ids: forecastIds })
        });

        if (!response.ok) throw new Error('Failed to process forecasts');
        
        const data = await response.json();
        
        // Update UI
        selectedForecasts.forEach(forecast => {
            forecast.classList.add(isApproved ? 'approved' : 'rejected');
            const checkbox = forecast.querySelector('.forecast-checkbox input');
            checkbox.disabled = true;
            checkbox.checked = false;
            
            // Enhanced removal animation
            removeForecastWithAnimation(forecast);
        });

        // Update trust scores
        if (isApproved) {
            updateTrustScores(card, 2); // Increase score by 2 points for approvals
        }

        // Hide loading and show success
        loadingToast.remove();
        showToast(
            `Successfully ${isApproved ? 'approved' : 'rejected'} ${selectedForecasts.length} ${forecastType} forecasts`,
            'success'
        );
        
    } catch (error) {
        console.error(`Error processing ${forecastType} forecasts:`, error);
        
        // Handle specific error types
        let errorMessage = 'An unexpected error occurred';
        if (error.name === 'TypeError' || !navigator.onLine) {
            errorMessage = 'Network error: Please check your connection';
        } else if (error instanceof SyntaxError) {
            errorMessage = 'Invalid response from server';
        }

        const toastMessage = `${errorMessage}. <button class="retry-btn">Retry</button>`;
        const toast = showToast(toastMessage, 'error', false, true);
        
        // Add retry functionality
        const retryBtn = toast.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (retryCount >= MAX_RETRIES) {
                    showToast(`Maximum retry attempts (${MAX_RETRIES}) reached`, 'error');
                    return;
                }
                toast.remove();
                handleApproval(card, isApproved, forecastType, retryCount + 1);
            });
        }
    } finally {
        card.classList.remove('processing', loadingClass);
        updateButtonStates(card, false);
        
        // Clear all checkbox selections and update button states
        clearCheckboxSelections(card);
    }
}

function updateButtonStates(card, hasSelection) {
    const approveBtn = card.querySelector('.btn-approve');
    const rejectBtn = card.querySelector('.btn-reject');
    
    if (approveBtn && rejectBtn) {
        const isProcessing = card.classList.contains('processing');
        approveBtn.disabled = !hasSelection || isProcessing;
        rejectBtn.disabled = !hasSelection || isProcessing;
        
        // Update button text based on state
        const buttonText = isProcessing ? 
            '<i class="fas fa-spinner fa-spin"></i> Processing...' :
            hasSelection ? 
                approveBtn === document.activeElement ? 
                    '<i class="fas fa-check"></i> Press Enter to Approve' :
                    '<i class="fas fa-check"></i> Approve Selected' :
                '<i class="fas fa-check"></i> Select Items to Approve';

        approveBtn.innerHTML = buttonText;
        rejectBtn.innerHTML = isProcessing ?
            '<i class="fas fa-spinner fa-spin"></i> Processing...' :
            '<i class="fas fa-times"></i> ' + (hasSelection ? 'Reject Selected' : 'Select Items to Reject');
    }
}

// Search functionality
function filterForecasts(searchTerm) {
    const forecastItems = document.querySelectorAll('.forecast-item');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    let visibleCount = 0;

    forecastItems.forEach(item => {
        const regionPill = item.querySelector('.region-pill');
        const forecastText = item.querySelector('.forecast-text');
        
        if (!regionPill || !forecastText) return;

        const region = regionPill.textContent.toLowerCase();
        const text = forecastText.textContent.toLowerCase();
        const isVisible = region.includes(normalizedSearch) || text.includes(normalizedSearch);
        
        item.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    // Update screen reader
    announceToScreenReader(`Showing ${visibleCount} forecasts matching "${searchTerm}"`);
    return visibleCount;
}

function initSearchFunctionality() {
    const searchInput = document.getElementById('regionSearch');
    const clearButton = document.getElementById('clearFilters');

    if (searchInput && clearButton) {
        searchInput.addEventListener('input', (e) => {
            const count = filterForecasts(e.target.value);
            // Show toast if no results
            if (count === 0 && e.target.value.trim() !== '') {
                showToast('No forecasts found matching your search', 'info');
            }
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            filterForecasts('');
            showToast('Search cleared', 'info');
        });

        // Add keyboard support for clear button
        clearButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clearButton.click();
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTrustScores();
        initSearchFunctionality();
        initApprovalSystem();
    });
} else {
    initTrustScores();
    initSearchFunctionality();
    initApprovalSystem();
}

// Utility function for showing toast notifications
function showToast(message, type = 'info', autoHide = true, isHTML = false) {
    document.querySelectorAll(`.toast-${type}`).forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    if (isHTML) {
        toast.innerHTML = message;
    } else {
        toast.textContent = message;
    }
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    if (autoHide) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, type === 'danger' ? 0 : 3000);
    }
    
    return toast;
}
