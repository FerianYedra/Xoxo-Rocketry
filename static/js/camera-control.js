// Camera Control Script for XOXO Rocketry Dashboard
class CameraController {
    constructor() {
        this.cameraIframe = document.getElementById('camera-iframe');
        this.noSignalText = document.getElementById('no-signal-text');
        this.isLive = false;
        this.currentVideoId = null;
        
        // Elementos de la interfaz
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        this.loadCameraConfig();
    }
    
    async loadCameraConfig() {
        try {
            const response = await fetch('/api/camera/config');
            const config = await response.json();
            
            if (config.disabled) {
                this.hideWidget();
                return;
            }
            
            if (config.videoId && config.isActive) {
                this.currentVideoId = config.videoId;
                this.startLiveStream();
            } else {
                this.updateStatus('offline', 'Sin señal');
            }
        } catch (error) {
            console.log('No camera config found, using defaults');
            this.updateStatus('offline', 'Sin señal');
        }
    }
    
    hideWidget() {
        const cameraWidget = document.querySelector('.camera-widget');
        if (cameraWidget) {
            cameraWidget.style.display = 'none';
        }
    }

    // Activar transmisión en vivo
    startLiveStream(videoId = null) {
        const targetVideoId = videoId || this.currentVideoId;
        if (!targetVideoId) {
            this.updateStatus('offline', 'Sin señal');
            return;
        }

        this.updateStatus('loading', 'Conectando...');
        
        const embedUrl = `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&mute=1`;
        
        this.cameraIframe.src = embedUrl;
        this.cameraIframe.style.display = 'block';
        this.noSignalText.style.display = 'none';
        this.isLive = true;
        
        this.updateStatus('online', 'En vivo');
        
        console.log(`Live stream started with video ID: ${targetVideoId}`);
    }

    updateStatus(type, text) {
        this.statusIndicator.className = `status-indicator status-${type}`;
        this.statusText.textContent = text;
    }

}

// Crear instancia global
window.cameraController = new CameraController();
