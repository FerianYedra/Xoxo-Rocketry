// static/js/ai-analysis.js - Integración con Google AI Studio (Gemini)
import { GEMINI_API_KEY } from './config.js';
console.log("Key: ", GEMINI_API_KEY)

class AIAnalyzer {
    constructor() {
        this.apiKey = GEMINI_API_KEY;
        this.aiMessage = document.getElementById('ai-message');
        this.aiStatusDot = document.getElementById('ai-status-dot');
        this.aiStatusText = document.getElementById('ai-status-text');
        this.dataBuffer = []; // Buffer para acumular datos
        this.maxBufferSize = 10; // Analizar cada 10 datos
        this.lastDataTime = 0; // Timestamp del último dato recibido
        this.lastChangeTime = 0; // Timestamp del último cambio significativo
        this.inactivityTimeout = 20000; // 20 segundos sin cambios
        this.timeoutCheckInterval = null; // Intervalo para verificar inactividad
        this.isAnalyzing = false;
        this.lastData = null; // Último dato para comparar cambios
        this.initialMessage = 'Espera nuestro siguiente vuelo';
        this.prompt = `Eres un experto en cohetería deportiva y te han dado la tarea de analizar datos en tiempo real de un vuelo. Tu misión es interpretar estos datos técnicos y explicarlos de manera entusiasta y accesible para personas sin conocimientos técnicos que están emocionadas por ver un cohete volar.
Evita usar simbolos para formatear el texto (*, -, _, etc)
Tus explicaciones deben:
1. Ser breves pero informativas (máximo 3-4 oraciones)
2. Usar lenguaje sencillo y evitar jerga técnica innecesaria
3. Destacar lo más interesante o importante que está sucediendo en ese momento
4. Transmitir emoción y asombro por el vuelo del cohete
5. Explicar qué significan los cambios en altitud, aceleración, presión o temperatura para el vuelo
6. Mencionar si el cohete está en fase de despegue, ascenso, apogeo, descenso o aterrizaje
7. Si el cohete ha caído o aterrizado, mencionarlo claramente

Si los datos muestran una situación crítica o anormal, explícala de manera informativa sin causar alarma.

Datos recopilados (últimos 10 puntos):
`;
    }

    // Inicializar el analizador
    init() {
        console.log('Inicializando AI Analyzer');
        this.updateStatus('waiting', 'Esperando datos');
        this.aiMessage.textContent = this.initialMessage;
        this.startInactivityCheck();
    }

    // Iniciar verificación de inactividad
    startInactivityCheck() {
        // Verificar cada 2 segundos si han pasado 20 segundos sin cambios
        this.timeoutCheckInterval = setInterval(() => {
            if (this.lastChangeTime > 0) {
                const timeSinceLastChange = Date.now() - this.lastChangeTime;
                if (timeSinceLastChange > this.inactivityTimeout) {
                    console.log('⏱️ Inactividad: 20 segundos sin cambios, reseteando');
                    this.resetToInitialState();
                }
            }
        }, 2000);
    }

    // Resetear al estado inicial
    resetToInitialState() {
        this.dataBuffer = [];
        this.lastDataTime = 0;
        this.lastChangeTime = 0;
        this.lastData = null;
        this.aiMessage.textContent = this.initialMessage;
        this.updateStatus('waiting', 'Esperando datos');
        console.log('🔄 Estado reseteado a inicial');
    }

    // Actualizar el estado visual del analizador
    updateStatus(status, message) {
        if (status === 'online') {
            this.aiStatusDot.className = 'status-online';
            this.aiStatusText.textContent = message || 'Analizando datos';
        } else if (status === 'waiting') {
            this.aiStatusDot.className = 'status-offline';
            this.aiStatusText.textContent = message || 'Esperando datos';
        } else {
            this.aiStatusDot.className = 'status-offline';
            this.aiStatusText.textContent = message || 'Error en el análisis';
        }
    }

    // Verificar si hay cambios significativos en los datos
    hasSignificantChange(newData) {
        if (!this.lastData) return true;
        
        const significantChange = 
            Math.abs(newData.altitude - this.lastData.altitude) > 1 ||
            Math.abs(newData.acceleration - this.lastData.acceleration) > 0.3 ||
            Math.abs(newData.pressure - this.lastData.pressure) > 0.5 ||
            Math.abs(newData.temperature - this.lastData.temperature) > 0.3;
        
        return significantChange;
    }

    // Agregar datos al buffer
    addData(data) {
        console.log('📥 Recibiendo dato:', {
            altitude: data.altitude,
            acceleration: data.acceleration,
            status: data.status
        });
        
        // Actualizar timestamp del último dato
        this.lastDataTime = Date.now();
        
        if (data.status === 'STANDBY') {
            console.log('⏸️ Estado en STANDBY, reseteando');
            this.resetToInitialState();
            return;
        }

        // Verificar si hay cambios significativos
        const hasChange = this.hasSignificantChange(data);
        if (hasChange) {
            console.log('✨ Cambio significativo detectado');
            this.lastChangeTime = Date.now();
        } else {
            const timeSinceLastChange = Date.now() - this.lastChangeTime;
            console.log(`⏳ Sin cambios significativos (${(timeSinceLastChange / 1000).toFixed(1)}s desde último cambio)`);
        }

        // SIEMPRE agregar dato al buffer (análisis continuo cada segundo)
        this.dataBuffer.push({
            altitude: data.altitude,
            acceleration: data.acceleration,
            pressure: data.pressure,
            temperature: data.temperature,
            status: data.status,
            latitude: data.latitude,
            longitude: data.longitude,
            elapsedTime: data.elapsedTime,
            timestamp: Date.now()
        });

        // Actualizar último dato
        this.lastData = {
            altitude: data.altitude,
            acceleration: data.acceleration,
            pressure: data.pressure,
            temperature: data.temperature
        };

        console.log(`📊 Buffer: ${this.dataBuffer.length}/${this.maxBufferSize} datos acumulados`);

        // Si alcanzamos 10 datos, analizar
        if (this.dataBuffer.length >= this.maxBufferSize) {
            console.log('✅ Buffer lleno, iniciando análisis');
            this.analyzeBufferedData();
        } else {
            this.updateStatus('waiting', `Acumulando datos (${this.dataBuffer.length}/10)`);
        }
    }

    // Procesar los datos del buffer para la IA
    processBufferForAI() {
        let dataText = '';
        
        this.dataBuffer.forEach((data, index) => {
            dataText += `\nPunto ${index + 1}:
- Altitud: ${data.altitude.toFixed(2)} metros
- Aceleración: ${data.acceleration.toFixed(2)} m/s²
- Presión: ${data.pressure.toFixed(2)} hPa
- Temperatura: ${data.temperature.toFixed(2)} °C
- Estado: ${data.status}
- Tiempo: ${data.elapsedTime} segundos
`;
        });

        // Calcular tendencias
        const firstData = this.dataBuffer[0];
        const lastData = this.dataBuffer[this.dataBuffer.length - 1];
        
        dataText += `\nTendencias observadas en estos 10 puntos:
- Cambio de altitud: ${(lastData.altitude - firstData.altitude).toFixed(2)} metros
- Cambio de aceleración: ${(lastData.acceleration - firstData.acceleration).toFixed(2)} m/s²
- Cambio de presión: ${(lastData.pressure - firstData.pressure).toFixed(2)} hPa
- Cambio de temperatura: ${(lastData.temperature - firstData.temperature).toFixed(2)} °C
- Altitud actual: ${lastData.altitude.toFixed(2)} metros
`;

        return dataText;
    }

    // Analizar los datos acumulados con Google AI Studio (Gemini)
    async analyzeBufferedData() {
        if (this.isAnalyzing) {
            console.log('⏳ Ya hay un análisis en curso, esperando...');
            return;
        }

        console.log('🔍 Iniciando análisis de datos acumulados');
        console.log('🔑 API Key configurada:', this.apiKey ? 'Sí (longitud: ' + this.apiKey.length + ')' : 'No');
        
        if (!this.apiKey) {
            console.error('❌ API Key no configurada para Google AI Studio');
            this.updateStatus('error', 'API Key no configurada');
            return;
        }

        this.isAnalyzing = true;
        this.updateStatus('online', 'Analizando datos...');

        try {
            const processedData = this.processBufferForAI();
            const fullPrompt = this.prompt + processedData;
            console.log('📝 Prompt preparado para enviar a la API');
            
            console.log('🌐 Enviando solicitud a la API de Gemini...');
            const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }]
            };
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📨 Respuesta recibida, estado:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Texto de error completo:', errorText);
                throw new Error(`Error en la API: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('📊 Respuesta JSON recibida');
            
            if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
                const analysisText = result.candidates[0].content.parts[0].text;
                console.log('✅ Análisis completado:', analysisText.substring(0, 50) + '...');
                this.aiMessage.textContent = analysisText;
                this.updateStatus('online', 'Análisis completado');
                
                // Limpiar el buffer después del análisis
                this.dataBuffer = [];
                console.log('🗑️ Buffer limpiado, listo para nuevos datos');
            } else {
                console.error('❌ Formato de respuesta inesperado:', result);
                throw new Error('Formato de respuesta inesperado');
            }
        } catch (error) {
            console.error('❌ Error al analizar datos:', error);
            console.error('❌ Detalles del error:', error.message);
            this.updateStatus('error', 'Error en el análisis');
            this.aiMessage.textContent = 'Error al analizar los datos. Esperando nuevos datos...';
        } finally {
            this.isAnalyzing = false;
            console.log('🏁 Análisis finalizado');
        }
    }

    // Limpiar recursos
    destroy() {
        if (this.timeoutCheckInterval) {
            clearInterval(this.timeoutCheckInterval);
        }
    }
}

// Exportar la clase para su uso en dashboard.js
export default AIAnalyzer;