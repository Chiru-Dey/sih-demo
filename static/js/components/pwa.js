// PWA Component JavaScript

// PWA Functions
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered');
                showNotification('📱 App is ready for offline use', 'success');
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
                showNotification('⚠️ Offline features may be limited', 'warning');
            });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showPWABanner();
    });

    document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA install result: ${outcome}`);
            
            if (outcome === 'accepted') {
                showNotification('✅ App installed successfully!', 'success');
            } else {
                showNotification('ℹ️ App installation cancelled', 'info');
            }
            
            deferredPrompt = null;
            hidePWABanner();
        }
    });

    // Network status monitoring
    window.addEventListener('online', () => {
        isOnline = true;
        updateOfflineStatus();
        showNotification('🌐 Back online', 'success');
        
        // Sync any pending data when back online
        syncPendingData();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateOfflineStatus();
        showNotification('📱 You\'re offline - Limited features available', 'warning');
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA was installed');
        showNotification('🎉 Disaster Management App installed!', 'success');
        hidePWABanner();
        
        // Track installation
        trackPWAInstallation();
    });

    updateOfflineStatus();
    
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        document.body.classList.add('pwa-mode');
        console.log('🚀 Running as installed PWA');
    }
}

function showPWABanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.classList.add('show');
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (banner.classList.contains('show')) {
                hidePWABanner();
            }
        }, 30000);
    }
}

function hidePWABanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.classList.remove('show');
    }
}

function updateOfflineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
        if (isOnline) {
            indicator.classList.remove('show');
        } else {
            indicator.classList.add('show');
        }
    }
    
    // Update UI elements based on online status
    updateUIForNetworkStatus();
}

function updateUIForNetworkStatus() {
    const translateBtn = document.getElementById('translateBtn');
    const aiButtons = document.querySelectorAll('.ai-assistant');
    
    if (!isOnline) {
        // Disable features that require internet
        if (translateBtn) {
            translateBtn.disabled = true;
            translateBtn.title = 'Translation requires internet connection';
        }
        
        aiButtons.forEach(btn => {
            btn.style.opacity = '0.6';
            btn.title = 'AI features require internet connection';
        });
    } else {
        // Re-enable features when online
        if (translateBtn) {
            translateBtn.disabled = false;
            translateBtn.title = '';
        }
        
        aiButtons.forEach(btn => {
            btn.style.opacity = '1';
            btn.title = '';
        });
    }
}

// Offline data management
function storeOfflineData(key, data) {
    try {
        localStorage.setItem(`offline_${key}`, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to store offline data:', error);
    }
}

function getOfflineData(key) {
    try {
        const stored = localStorage.getItem(`offline_${key}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Return data if less than 24 hours old
            if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                return parsed.data;
            } else {
                localStorage.removeItem(`offline_${key}`);
            }
        }
    } catch (error) {
        console.warn('Failed to retrieve offline data:', error);
    }
    return null;
}

function syncPendingData() {
    // Sync any data that was stored while offline
    const pendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pending_'));
    
    pendingKeys.forEach(async (key) => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            // Attempt to sync data to server
            await syncDataToServer(data);
            localStorage.removeItem(key);
            console.log(`✅ Synced pending data: ${key}`);
        } catch (error) {
            console.warn(`Failed to sync ${key}:`, error);
        }
    });
    
    if (pendingKeys.length > 0) {
        showNotification(`🔄 Synced ${pendingKeys.length} pending items`, 'success');
    }
}

async function syncDataToServer(data) {
    // This would sync data to your backend when connection is restored
    // Implementation depends on your specific backend requirements
    console.log('Syncing data to server:', data);
}

// PWA performance monitoring
function trackPWAPerformance() {
    // Performance API monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                const loadTime = perfData.loadEventEnd - perfData.fetchStart;
                
                console.log(`📊 App load time: ${loadTime}ms`);
                
                // Store performance data
                storeOfflineData('performance', {
                    loadTime: loadTime,
                    timestamp: Date.now()
                });
            }, 0);
        });
    }
}

function trackPWAInstallation() {
    // Track PWA installation for analytics
    storeOfflineData('pwa_installed', {
        installed: true,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
    });
}

// Background sync for emergency data
function setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            // Register for background sync
            return registration.sync.register('emergency-data-sync');
        }).catch(error => {
            console.warn('Background sync not supported:', error);
        });
    }
}

// Push notifications setup
function setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        // Request notification permission
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Notifications enabled');
                showNotification('🔔 Emergency alerts enabled', 'success');
                
                // Set up push subscription
                return setupPushSubscription();
            } else {
                console.log('⚠️ Notifications denied');
                showNotification('🔕 Enable notifications for emergency alerts', 'warning');
            }
        });
    }
}

async function setupPushSubscription() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array('YOUR_VAPID_PUBLIC_KEY') // Replace with actual VAPID key
        });
        
        // Send subscription to server
        await sendSubscriptionToServer(subscription);
        
        console.log('✅ Push subscription created');
    } catch (error) {
        console.warn('Failed to create push subscription:', error);
    }
}

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function sendSubscriptionToServer(subscription) {
    // Send the subscription to your backend
    try {
        await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        });
    } catch (error) {
        console.warn('Failed to send subscription to server:', error);
    }
}

// App update detection
function checkForAppUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            showNotification('🔄 App updated! Refresh to see changes', 'info');
            
            // Auto-refresh after 5 seconds
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        });
    }
}

// Initialize PWA features
function initPWAFeatures() {
    initPWA();
    trackPWAPerformance();
    setupBackgroundSync();
    setupPushNotifications();
    checkForAppUpdates();
    
    console.log('📱 PWA features initialized');
}

// Add PWA-specific styles
const pwaStyles = document.createElement('style');
pwaStyles.textContent = `
    body.pwa-mode {
        /* Styles for when running as installed PWA */
        padding-top: 100px; /* Adjust for status bar if needed */
    }
    
    .pwa-install-banner {
        animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .offline-mode .translate-btn,
    .offline-mode .ai-assistant {
        opacity: 0.6;
        pointer-events: none;
    }
`;
document.head.appendChild(pwaStyles);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPWAFeatures);