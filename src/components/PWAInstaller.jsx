
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
      {/* Offline Indicator - Hidden when offline */}
      {/* Removed offline indicator as requested */}

      {/* Install Banner */}
      {showInstallBanner && (
        <div className="position-fixed top-50 start-50 translate-middle" 
             style={{ 
               zIndex: 9998, 
               width: '90%', 
               maxWidth: '400px',
               background: 'white',
               borderRadius: '12px',
               boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
               border: '2px solid #4CAF50'
             }}>
          <div className="position-relative p-4">
            <button 
              className="position-absolute top-0 end-0 m-2 btn-close"
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            
            <div className="text-center">
              <div className="mb-3">
                <span style={{ fontSize: '48px' }}>📱</span>
              </div>
              <h4 className="mb-2" style={{ color: '#333', fontWeight: 'bold' }}>
                Install Quiz App
              </h4>
              <p className="mb-3 text-muted">
                Get faster access and offline support!
              </p>
              <button 
                className="btn btn-primary btn-lg w-100" 
                onClick={handleInstallClick}
                style={{
                  background: '#4CAF50',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: 'bold'
                }}
              >
                🚀 Install Now
              </button>
              <button 
                className="btn btn-link text-muted mt-2 w-100" 
                onClick={handleDismiss}
                style={{ textDecoration: 'none', fontSize: '14px' }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {showInstallBanner && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 9997,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={handleDismiss}
        />
      )}
    </>
  );
};

export default PWAInstaller;
