// Admin Forecasts & Alerts Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    initTrustScores();
    initRegionFilter();
    initApprovalSystem();
    initScoreUpdates();
});

// Region Filter functionality
function initRegionFilter() {
    const searchInput = document.getElementById('regionSearch');
    const activeFilters = document.getElementById('activeFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    let selectedRegions = new Set();
    let debounceTimeout = null;

    // Fetch unique regions from all forecasts
    function getAllRegions() {
        const regionSpans = document.querySelectorAll('.forecast-meta .region');
        const regions = new Set();
        regionSpans.forEach(span => {
            const region = span.textContent.replace('Region: ', '').trim();
            regions.add(region);
        });
        return Array.from(regions);
    }

    // Debounced search handler
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length >= 2) {
                const regions = getAllRegions();
                const matches = regions.filter(region => 
                    region.toLowerCase().includes(query)
                );
                showAutocompleteSuggestions(matches);
            } else {
                hideAutocompleteSuggestions();
            }
        }, 300); // 300ms debounce delay
    });

    // Autocomplete suggestions
    function showAutocompleteSuggestions(matches) {
        let suggestionsDiv = document.getElementById('regionSuggestions');
        if (!suggestionsDiv) {
            suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'regionSuggestions';
            suggestionsDiv.className = 'region-suggestions';
            searchInput.parentNode.appendChild(suggestionsDiv);
        }

        suggestionsDiv.innerHTML = '';
        matches.forEach(region => {
            if (!selectedRegions.has(region)) {
                const suggestion = document.createElement('div');
                suggestion.className = 'region-suggestion';
                suggestion.textContent = region;
                suggestion.addEventListener('click', () => {
                    addFilterTag(region);
                    hideAutocompleteSuggestions();
                    searchInput.value = '';
                });
                suggestionsDiv.appendChild(suggestion);
            }
        });

        suggestionsDiv.style.display = matches.length > 0 ? 'block' : 'none';
    }

    function hideAutocompleteSuggestions() {
        const suggestionsDiv = document.getElementById('regionSuggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
    }

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideAutocompleteSuggestions();
        }
    });

    // Add filter tag
    function addFilterTag(region) {
        if (selectedRegions.has(region)) return;

        selectedRegions.add(region);
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.dataset.region = region;
        tag.innerHTML = `
            ${region}
            <button aria-label="Remove ${region} filter">
                <i class="fas fa-times"></i>
            </button>
        `;

        tag.querySelector('button').addEventListener('click', () => removeFilter(region));
        activeFilters.appendChild(tag);
        
        filterForecasts();
        updateFilterCount();
    }

    // Remove filter tag
    function removeFilter(region) {
        selectedRegions.delete(region);
        const tag = activeFilters.querySelector(`[data-region="${region}"]`);
        if (tag) {
            tag.remove();
        }
        filterForecasts();
        updateFilterCount();
    }

    // Clear all filters
    clearFiltersBtn.addEventListener('click', () => {
        selectedRegions.clear();
        activeFilters.innerHTML = '';
        filterForecasts();
        updateFilterCount();
    });

    // Filter forecasts
    function filterForecasts() {
        const forecasts = document.querySelectorAll('.forecast-item');
        forecasts.forEach(forecast => {
            const regionElement = forecast.querySelector('.region');
            const forecastRegion = regionElement ? regionElement.textContent.replace('Region:', '').trim() : '';
            const shouldShow = selectedRegions.size === 0 || selectedRegions.has(forecastRegion);
            
            if (shouldShow) {
                forecast.style.display = 'block';
                forecast.animate([
                    { opacity: 0, transform: 'translateY(-10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], {
                    duration: 300,
                    easing: 'ease-out'
                });
            } else {
                forecast.style.display = 'none';
            }
        });
    }

    // Update filter count
    function updateFilterCount() {
        const count = selectedRegions.size;
        clearFiltersBtn.style.display = count > 0 ? 'block' : 'none';
        clearFiltersBtn.innerHTML = `
            <i class="fas fa-times"></i> Clear All (${count})
        `;
    }
}

// Approval System functionality
function initApprovalSystem() {
    const forecastCards = document.querySelectorAll('.forecast-card');
    
    forecastCards.forEach(card => {
        const approveBtn = card.querySelector('.btn-approve');
        const rejectBtn = card.querySelector('.btn-reject');
        const checkboxes = card.querySelectorAll('.forecast-checkbox input');
        
        if (approveBtn && rejectBtn) {
            approveBtn.addEventListener('click', () => handleApproval(card, true));
            rejectBtn.addEventListener('click', () => handleApproval(card, false));
        }
        
        // Toggle button states based on selection
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const hasSelection = Array.from(checkboxes).some(cb => cb.checked);
                updateButtonStates(card, hasSelection);
            });
        });
    });
}

async function handleApproval(card, isApproved) {
    const selectedForecasts = Array.from(card.querySelectorAll('.forecast-checkbox input:checked'))
        .map(checkbox => checkbox.closest('.forecast-item'));
    
    if (selectedForecasts.length === 0) {
        showToast('Please select at least one forecast', 'warning');
        return;
    }
    
    const forecastIds = selectedForecasts.map(forecast => forecast.dataset.id);
    const endpoint = isApproved ? '/api/admin/forecasts/approve' : '/api/admin/forecasts/reject';
    
    try {
        // Show loading state
        const loadingToast = showToast('Processing...', 'info', false);
        card.classList.add('processing');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            
            // Animate out
            forecast.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(0.9)' }
            ], {
                duration: 300,
                easing: 'ease-out'
            }).onfinish = () => {
                forecast.style.display = 'none';
            };
        });

        // Update trust scores
        if (isApproved) {
            updateTrustScores(card, 2); // Increase score by 2 points for approvals
        }

        // Hide loading and show success
        loadingToast.remove();
        showToast(
            `Successfully ${isApproved ? 'approved' : 'rejected'} ${selectedForecasts.length} forecasts`,
            'success'
        );
        
    } catch (error) {
        console.error('Error processing forecasts:', error);
        showToast(error.message, 'error');
    } finally {
        card.classList.remove('processing');
        updateButtonStates(card, false);
    }
}

function updateButtonStates(card, hasSelection) {
    const approveBtn = card.querySelector('.btn-approve');
    const rejectBtn = card.querySelector('.btn-reject');
    
    if (approveBtn && rejectBtn) {
        approveBtn.disabled = !hasSelection;
        rejectBtn.disabled = !hasSelection;
    }
}

// Score Updates functionality
function initScoreUpdates() {
    document.querySelectorAll('.trust-score').forEach(scoreElement => {
        const score = parseInt(scoreElement.dataset.score);
        const circle = scoreElement.querySelector('.score-circle-progress');
        const circumference = 2 * Math.PI * 20; // r=20
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        animateScore(circle, 0, score, circumference);
    });
}

function updateTrustScores(card, change) {
    const trustScore = card.querySelector('.trust-score');
    if (!trustScore) return;

    const currentScore = parseInt(trustScore.dataset.score);
    const newScore = Math.min(Math.max(currentScore + change, 0), 100);
    
    const circle = trustScore.querySelector('.score-circle-progress');
    const scoreText = trustScore.querySelector('.score-text');
    const circumference = 2 * Math.PI * 20;

    // Animate score change
    animateScore(circle, currentScore, newScore, circumference);
    
    // Update displayed score
    trustScore.dataset.score = newScore;
    scoreText.textContent = `${newScore}%`;
    
    // Update criticality badge if needed
    updateCriticalityBadge(card, newScore);
}

function updateCriticalityBadge(card, score) {
    const badge = card.querySelector('.criticality-badge');
    if (!badge) return;

    let newLevel, newText;
    if (score >= 90) {
        newLevel = 'low';
        newText = 'Low Risk';
    } else if (score >= 70) {
        newLevel = 'medium';
        newText = 'Medium Risk';
    } else {
        newLevel = 'high';
        newText = 'High Risk';
    }

    // Remove old classes
    badge.classList.remove('low', 'medium', 'high');
    badge.classList.add(newLevel);
    badge.textContent = newText;

    // Animate badge update
    badge.animate([
        { transform: 'scale(0.9)', opacity: 0.7 },
        { transform: 'scale(1.1)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 }
    ], {
        duration: 300,
        easing: 'ease-out'
    });
}

function animateScore(circle, start, end, circumference) {
    const duration = 1500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentScore = start + (end - start) * easeOutQuart;
        
        // Update circle progress
        const offset = circumference - (currentScore / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Utility function for showing toast notifications
function showToast(message, type = 'info', autoHide = true) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    if (autoHide) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    return toast;
}