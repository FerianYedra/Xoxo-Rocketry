// static/js/dashboard.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Envolvemos todo en DOMContentLoaded para asegurar que la página esté lista
document.addEventListener("DOMContentLoaded", function() {

    // --- Estado Global y Elementos del DOM ---
    const altitudeEl = document.getElementById('altitude');
    const accelerationEl = document.getElementById('acceleration');
    const pressureEl = document.getElementById('pressure');
    const temperatureEl = document.getElementById('temperature');
    const statusTextEl = document.getElementById('status-text');
    let selectedGraphParam = 'altitude';
    const dataHistory = { altitude: [], acceleration: [], pressure: [], temperature: [] };
    const MAX_DATA_POINTS = 100;

    // --- Inicialización de Pestañas ---
    const tabDashboard = document.getElementById('tab-dashboard');
    const tab3d = document.getElementById('tab-3d');
    const viewDashboard = document.getElementById('view-dashboard');
    const view3d = document.getElementById('view-3d');

    tabDashboard.addEventListener('click', () => {
        tabDashboard.classList.add('active');
        tab3d.classList.remove('active');
        viewDashboard.classList.add('active');
        view3d.classList.remove('active');
    });

    tab3d.addEventListener('click', () => {
        tab3d.classList.add('active');
        tabDashboard.classList.remove('active');
        view3d.classList.add('active');
        viewDashboard.classList.remove('active');
    });

    // --- Inicialización del Mapa Leaflet ---
    const map = L.map('map').setView([19.5012, -99.4520], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    let rocketMarker = L.marker([19.5012, -99.4520]).addTo(map);

    // =======================================================
    // --- LÓGICA DE GRÁFICOS CON CHART.JS ---
    // =======================================================

    const graphCanvas = document.getElementById('graph-canvas');
    const graphCtx = graphCanvas.getContext('2d');

    const chartConfig = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Telemetría',
                data: [],
                borderColor: 'rgba(96, 165, 250, 1)', // Color inicial (Altitud)
                backgroundColor: 'rgba(96, 165, 250, 0.2)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: {
                    beginAtZero: false,
                    ticks: { color: 'rgba(229, 231, 235, 0.7)' },
                    grid: { color: 'rgba(55, 65, 81, 0.5)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    };
    
    const telemetryChart = new Chart(graphCtx, chartConfig);

    const paramStyles = {
        altitude:     { borderColor: 'rgba(96, 165, 250, 1)', backgroundColor: 'rgba(96, 165, 250, 0.2)' },
        acceleration: { borderColor: 'rgba(248, 113, 113, 1)', backgroundColor: 'rgba(248, 113, 113, 0.2)' },
        pressure:     { borderColor: 'rgba(250, 204, 21, 1)',  backgroundColor: 'rgba(250, 204, 21, 0.2)' },
        temperature:  { borderColor: 'rgba(52, 211, 153, 1)',  backgroundColor: 'rgba(52, 211, 153, 0.2)' }
    };

    function updateChart() {
        const data = dataHistory[selectedGraphParam];
        
        telemetryChart.data.labels = data.map((_, index) => index + 1);
        telemetryChart.data.datasets[0].data = data;
        
        const style = paramStyles[selectedGraphParam];
        telemetryChart.data.datasets[0].borderColor = style.borderColor;
        telemetryChart.data.datasets[0].backgroundColor = style.backgroundColor;
        
        telemetryChart.update('none');
    }

    // --- Lógica del Visor 3D (Separada en una función) ---
    function setupThreeJS(containerId, isInteractive, modelPath) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        camera.position.z = isInteractive ? 5 : 3;
        
        let controls;
        if (isInteractive) {
            controls = new OrbitControls(camera, renderer.domElement);
        }
        
        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(5, 10, 7.5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        
        const loader = new GLTFLoader();
        let model = null;
        loader.load(modelPath, gltf => { model = gltf.scene; scene.add(model); });
        
        function animate() {
            requestAnimationFrame(animate);
            if (isInteractive) controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        window.addEventListener('resize', () => {
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });

        return { getModel: () => model };
    }

    // --- Inicializar AMBOS visores 3D ---
    const liveVisor = setupThreeJS('live-renderer-container', false, 'static/models/Soporte_de_Motor_Inferior_Completo.glb');
    const interactiveVisor = setupThreeJS('interactive-renderer-container', true, 'static/models/Soporte_de_Motor_Inferior_Completo.glb');

    // --- Función para resetear la UI a su estado inicial ---
    function resetDashboardUI() {
        statusTextEl.textContent = "STANDBY";
        altitudeEl.innerHTML = `0.00 <span class="unit">m</span>`;
        accelerationEl.innerHTML = `0.00 <span class="unit">m/s²</span>`;
        pressureEl.innerHTML = `0.00 <span class="unit">hPa</span>`;
        temperatureEl.innerHTML = `0.00 <span class="unit">°C</span>`;
        
        Object.keys(dataHistory).forEach(key => dataHistory[key] = []);
        telemetryChart.data.labels = [];
        telemetryChart.data.datasets[0].data = [];
        telemetryChart.update();
        
        const initialLatLng = [19.5012, -99.4520];
        rocketMarker.setLatLng(initialLatLng);
        map.setView(initialLatLng, 13);
    }

    // --- Conexión SSE y Lógica Principal del Dashboard ---
    const eventSource = new EventSource("/api/telemetry-stream");
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if (data.status === "standby") {
            resetDashboardUI();
            return;
        }

        statusTextEl.textContent = data.status.toUpperCase();
        altitudeEl.innerHTML = `${data.altitude.toFixed(2)} <span class="unit">m</span>`;
        accelerationEl.innerHTML = `${data.acceleration.toFixed(2)} <span class="unit">m/s²</span>`;
        pressureEl.innerHTML = `${data.pressure.toFixed(2)} <span class="unit">hPa</span>`;
        temperatureEl.innerHTML = `${data.temperature.toFixed(2)} <span class="unit">°C</span>`;
        
        const newLatLng = [data.latitude, data.longitude];
        rocketMarker.setLatLng(newLatLng);
        map.panTo(newLatLng);
        
        Object.keys(dataHistory).forEach(key => {
            if(data[key] !== undefined && dataHistory[key]) {
                dataHistory[key].push(data[key]);
                if (dataHistory[key].length > MAX_DATA_POINTS) dataHistory[key].shift();
            }
        });
        updateChart();
        
        const liveModel = liveVisor.getModel();
        if (liveModel) {
            liveModel.rotation.x = data.altitude / 1000;
            liveModel.rotation.z = Math.sin(data.altitude / 100);
        }
    };

    // --- Event Listeners para Controles ---
    document.getElementById('start-sim-btn').addEventListener('click', () => {
        resetDashboardUI();
        fetch('/api/start-simulation', { method: 'POST' });
    });
    document.getElementById('stop-sim-btn').addEventListener('click', () => fetch('/api/stop-simulation', { method: 'POST' }));

    document.querySelectorAll('input[name="graph-param"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedGraphParam = e.target.value;
            updateChart();
        });
    });

    // --- Activar Vanilla Tilt ---
    VanillaTilt.init(document.querySelectorAll(".widget[data-tilt]"), {
        max: 5,
        speed: 400,
        glare: true,
        "max-glare": 0.2
    });

}); // Fin del DOMContentLoaded