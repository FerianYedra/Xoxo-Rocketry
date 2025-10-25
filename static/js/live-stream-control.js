// Live Stream Control Script for XOXO Rocketry Dashboard
class LiveStreamController {
    constructor() {
        this.liveStreamIframe = document.getElementById('video-iframe');
        this.liveStreamWidget = document.querySelector('.video-widget');
        this.isActive = false;
        this.currentVideoId = null;
        
        this.loadLiveStreamConfig();
    }
    
    async loadLiveStreamConfig() {
        try {
            const response = await fetch('/api/live-stream/config');
            const config = await response.json();
            
            if (config.disabled) {
                this.hideWidget();
                return;
            }
            
            if (config.isActive && config.videoId) {
                this.currentVideoId = config.videoId;
                this.startLiveStream();
            } else {
                this.hideWidget();
            }
        } catch (error) {
            console.log('No live stream config found, hiding widget');
            this.hideWidget();
        }
    }
    
    startLiveStream(videoId = null) {
        const targetVideoId = videoId || this.currentVideoId;
        if (!targetVideoId) {
            this.hideWidget();
            return;
        }

        const embedUrl = `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&mute=1`;
        
        this.liveStreamIframe.src = embedUrl;
        this.liveStreamIframe.style.display = 'block';
        this.isActive = true;
        
        // Mostrar el widget si estaba oculto
        if (this.liveStreamWidget) {
            this.liveStreamWidget.style.display = 'block';
        }
        
        console.log(`Live stream started with video ID: ${targetVideoId}`);
    }
    
    hideWidget() {
        if (this.liveStreamWidget) {
            this.liveStreamWidget.style.display = 'none';
        }
        this.isActive = false;
    }
}

// Crear instancia global
window.liveStreamController = new LiveStreamController();
