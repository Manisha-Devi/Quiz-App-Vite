
import React, { useState, useEffect } from 'react';

const PWAInstaller = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
  };

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="alert alert-warning position-fixed top-0 start-50 translate-middle-x mt-2" 
             style={{ zIndex: 9999, width: 'auto' }}>
          📱 You're offline - App data cached locally
        </div>
      )}

      {/* Install Banner */}
      {showInstallBanner && (
        <div className="alert alert-info position-fixed bottom-0 start-0 end-0 m-3" 
             style={{ zIndex: 9998 }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>📱 Install Quiz App</strong>
              <p className="mb-0 small">Get faster access and offline support!</p>
            </div>
            <div>
              <button 
                className="btn btn-primary btn-sm me-2" 
                onClick={handleInstallClick}
              >
                Install
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={handleDismiss}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstaller;
