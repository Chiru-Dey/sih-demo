// Initialize Leaflet map for UIT Bardhaman location
function initMap() {
    // UIT Bardhaman coordinates
    const uitCoords = [23.2324, 87.8614];
    
    // Create map centered on UIT
    const map = L.map('map').setView(uitCoords, 15);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add marker for UIT location
    L.marker(uitCoords)
        .addTo(map)
        .bindPopup('University Institute of Technology, Bardhaman<br>Dilkhusa Avenue, Golapbag')
        .openPopup();
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', initMap);