// Initialize Leaflet map for UIT Bardhaman location
function initMap() {
    try {
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }

        // UIT Bardhaman coordinates
        const uitCoords = [23.2324, 87.8614];
        
        // Create map centered on UIT
        const map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView(uitCoords, 15);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Add marker for UIT location
        L.marker(uitCoords)
            .addTo(map)
            .bindPopup('University Institute of Technology, Bardhaman<br>Dilkhusa Avenue, Golapbag')
            .openPopup();

        // Force a map refresh after initialization
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize map when DOM is loaded and wait for any dynamic content
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure container is fully rendered
    setTimeout(initMap, 100);
});