document.addEventListener("DOMContentLoaded", function() {

    // --- CARGA Y ACTIVACIÓN DEL HEADER Y FOOTER ---
    fetch('/static/includes/header.html') // Asumiendo que header.html está en /static/
        .then(response => response.text())
        .then(data => {
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = data;
            }

            // AHORA que el HTML del header está garantizado que existe, activamos sus componentes
            
            // 1. LÓGICA ÚNICA Y CORRECTA PARA EL MENÚ MÓVIL (HAMBURGUESA)
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const navMenu = document.getElementById('nav-menu');
            if (menuToggle && navMenu) {
                menuToggle.addEventListener('click', () => {
                    // Alternamos la clase 'active' en el botón y en el menú
                    menuToggle.classList.toggle('active');
                    navMenu.classList.toggle('active');
                    
                    // Bloquea/desbloquea el scroll del body cuando el menú está abierto
                    document.body.classList.toggle('no-scroll');
                });
                
                // Cerrar menú al hacer clic en un enlace
                const navLinks = navMenu.querySelectorAll('.nav-links a');
                navLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        menuToggle.classList.remove('active');
                        navMenu.classList.remove('active');
                        document.body.classList.remove('no-scroll');
                    });
                });
                
                // Lógica para dropdowns en móvil (click en lugar de hover)
                const dropdowns = navMenu.querySelectorAll('.dropdown');
                dropdowns.forEach(dropdown => {
                    const dropdownLink = dropdown.querySelector('> a');
                    const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                    
                    if (dropdownLink && dropdownMenu) {
                        dropdownLink.addEventListener('click', (e) => {
                            // Solo en móvil, prevenir el comportamiento por defecto
                            if (window.innerWidth <= 992) {
                                e.preventDefault();
                                dropdown.classList.toggle('active');
                            }
                        });
                    }
                });
            }

            // 2. LÓGICA PARA POBLAR EL DROPDOWN DE INTEGRANTES
            const integrantesDropdown = document.getElementById('integrantes-dropdown');
            if (integrantesDropdown && integrantesDropdown.children.length === 0) {
                fetch('/api/team')
                    .then(response => response.json())
                    .then(teamData => {
                        if (integrantesDropdown.children.length === 0) {
                            teamData.forEach(member => {
                                const listItem = document.createElement('li');
                                listItem.innerHTML = `<a href="/bio?id=${member.id}">${member.name}</a>`;
                                integrantesDropdown.appendChild(listItem);
                            });
                        }
                    })
                    .catch(error => console.error('Error al poblar dropdown de integrantes:', error));
            }
        })
        .catch(error => console.error('Error al cargar el header:', error));

    fetch('/static/includes/footer.html') // Asumiendo que footer.html está en /static/
        .then(response => response.text())
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
            }
        })
        .catch(error => console.error('Error al cargar el footer:', error));


    // --- TEMPORIZADOR DE LANZAMIENTO (SOLO SI ESTÁ EN LA PÁGINA) ---
    const daysEl = document.getElementById("days");
    if (daysEl) { // Este 'if' previene errores en otras páginas
        const countdownDate = new Date("Oct 23, 2025 15:00:00").getTime();
        const x = setInterval(function() {
            const now = new Date().getTime();
            const distance = countdownDate - now;
            const hoursEl = document.getElementById("hours");
            const minutesEl = document.getElementById("minutes");
            const secondsEl = document.getElementById("seconds");

            if (distance < 0) {
                clearInterval(x);
                document.getElementById("countdown").innerHTML = "<h2 class='section-title'>¡Hemos despegado!</h2>";
                return;
            }
            
            daysEl.innerText = Math.floor(distance / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
            hoursEl.innerText = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            minutesEl.innerText = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            secondsEl.innerText = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');
        }, 1000);
    }

    // ===============================================
    // --- CÓDIGO PARA LAS ESTRELLAS DE FONDO ---
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
            posX += (mouseX - posX) / 4;
            posY += (mouseY - posY) / 4;
            cursor.style.transform = `translate3d(${posX - (cursor.offsetWidth / 2)}px, ${posY - (cursor.offsetHeight / 2)}px, 0)`;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isMoving) {
                particles.push({
                    x: posX, 
                    y: posY,
                    size: Math.random() * 1.5 + 1,
                    life: 1,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5
                });
            }
            
            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.04;

                if (p.life > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
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