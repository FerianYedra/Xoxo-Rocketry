document.addEventListener("DOMContentLoaded", function() {
    // ===============================================
    // --- CÓDIGO PARA AÑADIR EL HEADER ---
    // ===============================================
    fetch('/static/includes/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;

            // --- AHORA QUE EL HEADER ESTÁ CARGADO, PODEMOS EJECUTAR EL CÓDIGO ---

            // 1. CÓDIGO PARA EL MENÚ MÓVIL (HAMBURGUESA)
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const navMenu = document.getElementById('nav-menu');

            if (menuToggle && navMenu) {
                menuToggle.addEventListener('click', () => {
                    menuToggle.classList.toggle('active');
                    navMenu.classList.toggle('active');
                });
            }
            
            // 2. CÓDIGO PARA POBLAR EL DROPDOWN DE INTEGRANTES
            const integrantesDropdown = document.getElementById('integrantes-dropdown');
            if (integrantesDropdown && integrantesDropdown.children.length === 0){
                fetch('/api/team')
                .then(response => response.json())
                .then(teamData => {
                    // Verificamos de nuevo por si acaso el fetch fue muy lento
                    if (integrantesDropdown.children.length === 0) {
                        teamData.forEach(member => {
                            const listItem = document.createElement('li');
                            // Usamos url_for para generar la URL correcta desde la plantilla del header
                            listItem.innerHTML = `<a href="/bio.html?id=${member.id}">${member.name}</a>`;
                            integrantesDropdown.appendChild(listItem);
                        });
                    }
                })
            }
            });

    // ===============================================
    // --- CÓDIGO PARA AÑAID RL FOOTER ---
    // ===============================================
    fetch('/static/includes/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        });

    // ===============================================
    // --- TEMPORIZADOR DE LANZAMIENTO ---
    // ===============================================
    const countdownDate = new Date("Oct 23, 2025 15:00:00").getTime();

    const x = setInterval(function() {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("days").innerText = days;
        document.getElementById("hours").innerText = hours;
        document.getElementById("minutes").innerText = minutes;
        document.getElementById("seconds").innerText = seconds;

        if (distance < 0) {
            clearInterval(x);
            document.getElementById("countdown").innerHTML = "<h2 class='section-title'>¡Hemos despegado!</h2>";
        }
    }, 1000);

    // ===============================================
    // --- CÓDIGO PARA LAS ESTRELLAS DE FONTO ---
    // ===============================================
    const starContainer = document.querySelector('.star-container');
    if (starContainer) {
        const numStars = 150; // Puedes ajustar este número

        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.classList.add('star');

            // Asigna tamaño, posición y animación aleatorios
            const size = Math.random() * 2 + 1; // Estrellas entre 1px y 3px
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;

            // Retraso y duración aleatorios para que no parpadeen todas a la vez
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${Math.random() * 5 + 3}s`;

            starContainer.appendChild(star);
        }
    }

    // ===============================================
    // --- CÓDIGO PARA EL MENÚ MÓVIL (HAMBURGUESA) ---
    // ===============================================
    setTimeout(() => {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }
    }, 100);

    // ===============================================
    // --- LÓGICA PARA EL CURSOR INTERACTIVO ORBITAL (v2) ---
    // ===============================================
    const cursor = document.querySelector('.custom-cursor');
    const canvas = document.getElementById('particle-trail-canvas');
    const ctx = canvas.getContext('2d');

    if (cursor && canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let mouseX = -100, mouseY = -100;
        let posX = -100, posY = -100;
        let particles = [];
        let isMoving = false;
        let moveTimeout;

        // 1. ACTUALIZAR LA POSICIÓN Y ESTADO DEL RATÓN
        window.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Activamos el estado "moviendo"
            isMoving = true;
            // Reiniciamos el temporizador cada vez que se mueve
            clearTimeout(moveTimeout);
            // Si el ratón deja de moverse por 50ms, desactivamos el estado
            moveTimeout = setTimeout(() => { isMoving = false; }, 50);
        });

        // 2. ANIMACIÓN DEL DELTA Y LAS PARTÍCULAS
        function animate() {
            // === CAMBIO 1: AUMENTAR RESPONSIVIDAD ===
            // Reducimos el divisor de 8 a 4. Un número más bajo = menos lag.
            // ¡Puedes probar con 3 o 5 para encontrar tu punto ideal!
            posX += (mouseX - posX) / 4;
            posY += (mouseY - posY) / 4;
            cursor.style.transform = `translate3d(${posX - (cursor.offsetWidth / 2)}px, ${posY - (cursor.offsetHeight / 2)}px, 0)`;

            // Limpiar el lienzo
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // === CAMBIO 2: SINCRONIZAR PARTÍCULAS ===
            // Solo generamos partículas si el estado es "moviendo"
            if (isMoving) {
                particles.push({
                    // Las generamos desde la posición del DELTA (posX, posY), no del ratón
                    x: posX, 
                    y: posY,
                    size: Math.random() * 1.5 + 1,
                    life: 1,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5
                });
            }
            
            // Dibujar y actualizar todas las partículas (esto no cambia)
            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.04;

                if (p.life > 0) {
                    ctx.fillStyle = `rgba(255, 2555, 255, ${p.life})`;
                    //ctx.fillStyle = `rgba(255, 165, 0, ${p.life})`; Naranja
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    particles.splice(i, 1);
                    i--;
                }
            }
            requestAnimationFrame(animate);
        }
        animate();

        // Las secciones 3 (Hover) y 4 (Click) se quedan exactamente igual
        const interactiveElements = document.querySelectorAll('a, button, .logo-slide');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
        });

        document.addEventListener('mousedown', () => {
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: mouseX,
                    y: mouseY,
                    size: Math.random() * 2 + 1,
                    life: 1,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4
                });
            }
        });
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
});