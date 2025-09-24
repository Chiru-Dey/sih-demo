// Emergency Alert Class
class EmergencyAlert {
    constructor() {
        this.initGeolocation();
    }

    async initGeolocation() {
        try {
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                if (result.state === 'granted') return;
            }
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, {
                enableHighAccuracy: true
            });
        } catch (error) {
            console.warn('Geolocation permission request failed:', error);
        }
    }

    async getLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            return {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (error) {
            console.error('Error getting location:', error);
            return null;
        }
    }

    async sendEmergencyAlert(locationData) {
        try {
            const response = await fetch('/api/emergency-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: locationData,
                    timestamp: new Date().toISOString(),
                    type: 'emergency_sos'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send emergency alert');
            }

            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        } catch (error) {
            console.error('Failed to send emergency alert:', error);
            throw error;
        }
    }
}

// Initialize the emergency alert system
const emergencyAlert = new EmergencyAlert();