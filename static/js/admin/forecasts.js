// Admin Forecasts & Alerts Page JavaScript

// Initialize trust scores functionality
// Application state
const APP_STATE = {
    initialized: false,
    errors: [],
    announcer: null
};

// Simple trust score display
function initializeTrustScoreElement(element) {
    const score = element.textContent.replace('Trust: ', '');
    element.setAttribute('role', 'text');
    element.setAttribute('aria-label', `Trust score: ${score}`);
}

function initTrustScores() {
    const trustScoreElements = document.querySelectorAll('.trust-score');
    trustScoreElements.forEach(initializeTrustScoreElement);
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

    // Start UI updates immediately
    card.classList.add('processing', loadingClass);

    // Update UI first
    selectedForecasts.forEach(forecast => {
        forecast.classList.add(isApproved ? 'approved' : 'rejected');
        const checkbox = forecast.querySelector('.forecast-checkbox input');
        checkbox.disabled = true;
        checkbox.checked = false;
        
        // Enhanced removal animation
        removeForecastWithAnimation(forecast);
    });

    try {
        const response = await fetch(`/api/admin/forecasts/${forecastType}/${isApproved ? 'approve' : 'reject'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forecast_ids: forecastIds })
        });

        if (!response.ok) {
            console.error(`API error: ${response.status}`);
            return;
        }
        
        // Update trust scores on successful approval
        if (isApproved && response.ok) {
            const trustScores = card.querySelectorAll('.trust-score');
            trustScores.forEach(score => {
                const currentScore = parseInt(score.textContent.replace('Trust: ', ''));
                const newScore = Math.min(100, currentScore + 2);
                score.textContent = `Trust: ${newScore}%`;
                score.setAttribute('aria-label', `Trust score: ${newScore}%`);
            });
        }
    } catch (error) {
        // Silent error logging
        console.error(`Error processing ${forecastType} forecasts:`, error);
    } finally {
        card.classList.remove('processing', loadingClass);
        updateButtonStates(card, false);
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
            // Just update screen reader - no toast needed
            if (count === 0 && e.target.value.trim() !== '') {
                announceToScreenReader('No forecasts found matching your search');
            }
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            filterForecasts('');
            announceToScreenReader('Search filters cleared');
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
