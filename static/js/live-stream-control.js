// Live Stream Control Script for XOXO Rocketry Dashboard
class LiveStreamController {
    constructor() {
        this.liveStreamIframe = document.getElementById('video-iframe');
        this.liveStreamWidget = document.querySelector('.video-widget.full-width');
        this.isActive = false;
        this.currentVideoId = null;
        
        // Iniciar la carga de configuración solo si estamos en la página del dashboard
        if (this.liveStreamIframe && this.liveStreamWidget) {
            this.loadLiveStreamConfig();
            
            // Agregar un intervalo para verificar la configuración periódicamente
            setInterval(() => this.loadLiveStreamConfig(), 30000); // Verificar cada 30 segundos
        }
    }
    
    async loadLiveStreamConfig() {
        try {
            const response = await fetch('/api/live-stream/config');
            const config = await response.json();
            
            console.log('Live stream config loaded:', config);
            
            if (config.disabled) {
                this.hideWidget();
                return;
            }
            
            if (config.isActive && config.videoId) {
                // Solo actualizar si el ID del video cambió o si estaba inactivo
                if (this.currentVideoId !== config.videoId || !this.isActive) {
                    this.currentVideoId = config.videoId;
                    this.startLiveStream();
                }
            } else {
                this.hideWidget();
            }
        } catch (error) {
            console.error('Error loading live stream config:', error);
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
        
        // Limpiar el iframe para evitar que siga cargando recursos
        if (this.liveStreamIframe) {
            this.liveStreamIframe.src = '';
        }
    }
}

// Crear instancia global cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    window.liveStreamController = new LiveStreamController();
});
