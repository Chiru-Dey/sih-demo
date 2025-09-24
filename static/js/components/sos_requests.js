class SOSRequests {
    constructor() {
        this.setupEventSource();
    }

    setupEventSource() {
        const eventSource = new EventSource('/sse/sos-updates');

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'sos_update' && data.data) {
                this.addNewRequest(data.data);
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            setTimeout(() => this.setupEventSource(), 5000);
        };

        this.eventSource = eventSource;
    }

    removeRequest(id, cardElement) {
        cardElement.remove();
        if (document.querySelectorAll('.sos-card').length === 0) {
            const grid = document.querySelector('.sos-requests-grid');
            grid.innerHTML = '<div class="no-requests"><p>No SOS requests found</p></div>';
        }
    }

    addNewRequest(request) {
        const grid = document.querySelector('.sos-requests-grid');
        const noRequests = document.querySelector('.no-requests');
        
        if (noRequests) {
            noRequests.remove();
        }

        const card = document.createElement('div');
        card.className = 'sos-card';
        card.dataset.id = request.id;
        card.innerHTML = `
            <div class="sos-header">
                <span class="timestamp">${request.timestamp}</span>
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
                <button class="btn remove-btn" onclick="sosRequests.removeRequest('${request.id}', this.closest('.sos-card'))">
                    Mark as Handled
                </button>
            </div>
        `;

        grid.insertBefore(card, grid.firstChild);
    }
}

// Initialize SOS Requests functionality
const sosRequests = new SOSRequests();