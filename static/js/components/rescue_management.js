// Rescue Management Component
'use strict';

// Global state
const state = {
    personnel: [],
    resourceCategories: [],
    pagination: {
        page: 1,
        perPage: 10,
        total: 0
    },
    filters: {
        search: '',
        status: '',
        city: '',
        resource: ''
    },
    sorting: {
        column: '',
        ascending: true
    },
    selectedRows: new Set()
};

// Error handling
function handleError(error, message) {
    console.error('Error:', error);
    showError(message || 'An error occurred. Please try again.');
}

// Initialize data
async function initializeData() {
    try {
        console.log('Loading data...');
        showLoader();

        const [personnelResponse, resourcesResponse] = await Promise.all([
            fetch('/api/rescue-personnel').catch(error => {
                console.error('Failed to fetch personnel:', error);
                throw new Error('Personnel API request failed');
            }),
            fetch('/api/resources/categories').catch(error => {
                console.error('Failed to fetch resources:', error);
                throw new Error('Resources API request failed');
            })
        ]);

        if (!personnelResponse.ok || !resourcesResponse.ok) {
            const errors = [];
            if (!personnelResponse.ok) errors.push(`Personnel API: ${personnelResponse.status}`);
            if (!resourcesResponse.ok) errors.push(`Resources API: ${resourcesResponse.status}`);
            throw new Error(`API errors: ${errors.join(', ')}`);
        }

        const [personnelData, resourceData] = await Promise.all([
            personnelResponse.json(),
            resourcesResponse.json()
        ]);

        state.personnel = personnelData;
        state.resourceCategories = resourceData;
        state.pagination.total = personnelData.length;

        updateQuickStats();
        renderTable();
        console.log('✅ Data initialized successfully');
    } catch (error) {
        handleError(error, 'Failed to load data. Please try again.');
    } finally {
        hideLoader();
    }
}

// Table setup functions
function setupSorting() {
    try {
        const sortableHeaders = document.querySelectorAll('th.sortable');
        if (!sortableHeaders.length) {
            console.warn('No sortable headers found');
            return;
        }

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                try {
                    const column = header.dataset.sort;
                    if (!column) {
                        throw new Error('Sort column not specified');
                    }

                    const wasAscending = state.sorting.column === column && state.sorting.ascending;
                    state.sorting = {
                        column: column,
                        ascending: !wasAscending
                    };
                    
                    console.log('Sorting updated:', state.sorting);
                    updateSortIndicators(header);
                    renderTable();
                } catch (error) {
                    handleError(error, 'Failed to sort table. Please try again.');
                }
            });
        });

        console.log('✅ Table sorting initialized');
    } catch (error) {
        handleError(error, 'Failed to setup sorting functionality');
    }
}

// Event listeners setup
function setupEventListeners() {
    try {
        const exportBtn = document.getElementById('exportBtn');
        const printBtn = document.getElementById('printBtn');
        const bulkActionBtn = document.getElementById('bulkActionBtn');
        
        if (!exportBtn || !printBtn) {
            throw new Error('Required buttons not found');
        }
        
        exportBtn.addEventListener('click', exportData);
        printBtn.addEventListener('click', printData);
        
        if (bulkActionBtn) {
            bulkActionBtn.addEventListener('click', handleBulkActions);
        }
        
        setupMobileHandlers();
        console.log('✅ Event listeners initialized');
    } catch (error) {
        handleError(error, 'Failed to setup event listeners');
    }
}

// Component initialization
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🎯 Initializing rescue management component...');
        await initializeData();
        setupSorting();
        setupEventListeners();
        console.log('🚀 Rescue management component ready!');
    } catch (error) {
        handleError(error, 'Failed to initialize rescue management component');
    }
});

// Window resize handler
const debouncedResize = debounce(function() {
    try {
        setupMobileHandlers();
        console.log('Mobile handlers updated on resize');
    } catch (error) {
        handleError(error, 'Failed to update mobile handlers');
    }
}, 250);

window.addEventListener('resize', debouncedResize);