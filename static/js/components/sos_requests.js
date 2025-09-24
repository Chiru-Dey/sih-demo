class SOSRequests {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupEventSource();
        this.currentFilters = {
            status: 'all',
            sortBy: 'newest'
        };
    }

    init() {
        // Add sort and filter controls to the page
        const controls = document.createElement('div');
        controls.className = 'sos-controls';
        controls.innerHTML = `
            <select class="sort-select" id="sortSelect">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
            </select>
            <div class="filter-buttons">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="pending">Pending</button>
                <button class="filter-btn" data-status="handled">Handled</button>
                <button class="filter-btn" data-status="closed">Closed</button>
            </div>
        `;
        document.querySelector('.page-title').after(controls);
    }

    setupEventListeners() {
        // Sort select listener
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentFilters.sortBy = e.target.value;
            this.applyFilters();
        });

        // Filter buttons listener
        document.querySelector('.filter-buttons').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilters.status = e.target.dataset.status;
                this.applyFilters();
            }
        });

        // Status update confirmation
        document.querySelectorAll('.sos-actions button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const cardElement = e.target.closest('.sos-card');
                const requestId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                const newStatus = e.target.getAttribute('onclick').match(/'([^']+)'\)$/)[1];
                
                this.confirmStatusUpdate(requestId, newStatus, cardElement);
            });
        });
    }

    setupEventSource() {
        // Setup EventSource connection for real-time updates
        const eventSource = new EventSource('/sse/sos-updates');

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'sos_update') {
                if (data.data) {
                    this.addNewRequest(data.data);
                } else if (data.id && data.status) {
                    this.updateRequestStatus(data.id, data.status);
                }
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            // Attempt to reconnect after a delay
            setTimeout(() => this.setupEventSource(), 5000);
        };

        this.eventSource = eventSource;
    }

    async handleSOS(id, newStatus, cardElement) {
        try {
            cardElement.classList.add('loading');
            
            const response = await fetch(`/rescue/sos-requests/${id}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const data = await response.json();
                this.updateRequestStatus(id, newStatus);
                this.showNotification('Status updated successfully', 'success');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
        } finally {
            cardElement.classList.remove('loading');
        }
    }

    confirmStatusUpdate(id, newStatus, cardElement) {
        const status = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        const dialog = document.createElement('dialog');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Confirm Status Update</h3>
                <p>Are you sure you want to mark this request as "${status}"?</p>
                <div class="dialog-actions">
                    <button class="btn secondary" data-action="cancel">Cancel</button>
                    <button class="btn primary" data-action="confirm">Confirm</button>
                </div>
            </div>
        `;

        dialog.querySelector('[data-action="cancel"]').onclick = () => dialog.close();
        dialog.querySelector('[data-action="confirm"]').onclick = () => {
            this.handleSOS(id, newStatus, cardElement);
            dialog.close();
        };

        document.body.appendChild(dialog);
        dialog.showModal();
    }

    updateRequestStatus(id, newStatus) {
        const card = document.querySelector(`.sos-card[data-id="${id}"]`);
        if (!card) return;

        // Update card status classes
        card.classList.remove('pending', 'handled', 'closed');
        card.classList.add(newStatus);

        // Update status badge
        const badge = card.querySelector('.status-badge');
        badge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

        // Update action buttons
        const actions = card.querySelector('.sos-actions');
        if (newStatus === 'pending') {
            actions.innerHTML = `
                <button class="btn primary" onclick="sosRequests.confirmStatusUpdate('${id}', 'handled', this.closest('.sos-card'))">
                    Mark as Handled
                </button>
            `;
        } else if (newStatus === 'handled') {
            actions.innerHTML = `
                <button class="btn secondary" onclick="sosRequests.confirmStatusUpdate('${id}', 'closed', this.closest('.sos-card'))">
                    Close Request
                </button>
            `;
        } else {
            actions.innerHTML = '';
        }

        this.applyFilters();
    }

    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupEventSource();
        this.currentFilters = {
            status: 'all',
            sortBy: 'newest'
        };
        // Add notification sound
        this.notificationSound = new Audio('/static/sounds/alert.mp3');
        this.notificationSound.load();
    }

    addNewRequest(request) {
        const grid = document.querySelector('.sos-requests-grid');
        const noRequests = document.querySelector('.no-requests');
        
        if (noRequests) {
            noRequests.remove();
        }

        // Play notification sound
        this.notificationSound.play().catch(error => {
            console.warn('Could not play notification sound:', error);
        });

        // Add visual alert animation to the page title
        this.startTitleAlert();

        const card = document.createElement('div');
        card.className = `sos-card ${request.status}`;
        card.dataset.id = request.id;
        card.innerHTML = `
            <div class="sos-header">
                <span class="timestamp">${request.timestamp}</span>
                <span class="status-badge">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
            </div>
            <div class="sos-body">
                <div class="sender-info">
                    <strong>${request.sender_name || 'Anonymous'}</strong>
                    <span class="contact">${request.contact}</span>
                </div>
                <div class="message">${request.message}</div>
                ${request.location ? `
                <div class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${request.location}
                </div>` : ''}
            </div>
            <div class="sos-actions">
                ${request.status === 'pending' ? `
                <button class="btn primary" onclick="sosRequests.confirmStatusUpdate('${request.id}', 'handled', this.closest('.sos-card'))">
                    Mark as Handled
                </button>` : ''}
                ${request.status === 'handled' ? `
                <button class="btn secondary" onclick="sosRequests.confirmStatusUpdate('${request.id}', 'closed', this.closest('.sos-card'))">
                    Close Request
                </button>` : ''}
            </div>
        `;

        grid.insertBefore(card, grid.firstChild);
        this.applyFilters();
        this.showNotification('🆘 New Emergency SOS Request!', 'error');
        // Vibrate device if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    applyFilters() {
        const cards = document.querySelectorAll('.sos-card');
        cards.forEach(card => {
            const status = card.classList.contains('pending') ? 'pending' :
                          card.classList.contains('handled') ? 'handled' : 'closed';
            
            // Apply status filter
            const statusMatch = this.currentFilters.status === 'all' || status === this.currentFilters.status;
            
            // Show/hide based on filters
            card.style.display = statusMatch ? 'block' : 'none';
        });

        // Apply sorting
        const grid = document.querySelector('.sos-requests-grid');
        const cardsArray = Array.from(cards).filter(card => card.style.display !== 'none');
        
        cardsArray.sort((a, b) => {
            const timeA = new Date(a.querySelector('.timestamp').textContent);
            const timeB = new Date(b.querySelector('.timestamp').textContent);
            return this.currentFilters.sortBy === 'newest' ? timeB - timeA : timeA - timeB;
        });

        cardsArray.forEach(card => grid.appendChild(card));
    }

    startTitleAlert() {
        const originalTitle = document.title;
        const alertTitle = '🆘 NEW SOS! 🆘';
        let isAlertTitle = false;
        
        const titleInterval = setInterval(() => {
            document.title = isAlertTitle ? originalTitle : alertTitle;
            isAlertTitle = !isAlertTitle;
        }, 1000);

        // Stop the title alert after 10 seconds
        setTimeout(() => {
            clearInterval(titleInterval);
            document.title = originalTitle;
        }, 10000);
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on type
        const icon = type === 'error' ? '🆘' :
                    type === 'success' ? '✅' :
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        notification.innerHTML = `${icon} ${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize SOS Requests functionality
const sosRequests = new SOSRequests();