document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname.toLowerCase();

    // Check if we are already on ANY dashboard or index to avoid showing navigation there
    const isDashboard = pathname.includes('dashboard_cliente.html') ||
        pathname.includes('dashboard_taller.html') ||
        pathname.includes('dashboard_mecanico.html') ||
        pathname.endsWith('/') ||
        pathname.includes('index.html'); // Index is the true home

    const isLogin = pathname.includes('login_cliente.html') ||
        pathname.includes('login_taller.html') ||
        pathname.includes('login_mecanico.html');

    if (!isDashboard) {
        // Encontrar el contenedor o menú cabecera principal ("header" / "dashboard-header" / "simple-header")
        let header = document.querySelector('header');

        if (!header) {
            // Si la página carece de etiqueta <header> (muy raro pero posible), lo fabricamos
            header = document.createElement('header');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background-color: #2c2c2c;
                margin-bottom: 20px;
            `;
            document.body.insertBefore(header, document.body.firstChild);
        }

        // Aseguramos que el header se comporte como un contenedor flexbox distribuido
        // Importante no sobreescribir si ya tiene un grid complejo, pero para nuestra app esto es seguro
        header.style.display = 'flex';
        header.style.flexWrap = 'nowrap';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        // Botón: Atrás (Flecha Izquierda)
        const btnBackWrap = document.createElement('div');
        btnBackWrap.style.cssText = `
            display: flex;
            align-items: center;
            margin-right: 15px;
            z-index: 999;
        `;
        const btnBack = document.createElement('a');
        btnBack.innerHTML = '<i class="fas fa-arrow-left"></i>';
        btnBack.title = "Atrás";
        btnBack.style.cssText = `
            color: #f39c12;
            font-size: 1.8em;
            text-decoration: none;
            cursor: pointer;
            transition: transform 0.2s ease, color 0.2s ease;
            display: inline-block;
        `;
        btnBack.onmouseover = () => { btnBack.style.transform = 'scale(1.2)'; btnBack.style.color = '#e67e22'; };
        btnBack.onmouseout = () => { btnBack.style.transform = 'scale(1)'; btnBack.style.color = '#f39c12'; };
        btnBack.onclick = (e) => {
            e.preventDefault();
            if (window.history.length > 1) { window.history.back(); } else { window.location.href = '/index.html'; }
        };
        btnBackWrap.appendChild(btnBack);

        // Botón: Inicio (Casa Derecha)
        const btnHomeWrap = document.createElement('div');
        btnHomeWrap.style.cssText = `
            display: flex;
            align-items: center;
            margin-left: auto;
            z-index: 999;
        `;
        const btnHome = document.createElement('a');
        btnHome.innerHTML = '<i class="fas fa-home"></i>';
        btnHome.title = "Inicio / Dashboard";
        btnHome.style.cssText = `
            color: #f39c12;
            font-size: 1.8em;
            text-decoration: none;
            cursor: pointer;
            transition: transform 0.2s ease, color 0.2s ease;
            display: inline-block;
        `;
        btnHome.onmouseover = () => { btnHome.style.transform = 'scale(1.2)'; btnHome.style.color = '#e67e22'; };
        btnHome.onmouseout = () => { btnHome.style.transform = 'scale(1)'; btnHome.style.color = '#f39c12'; };
        btnHome.onclick = (e) => {
            e.preventDefault();
            const host = window.location.origin;
            if (pathname.includes('/cliente/')) {
                window.location.href = host + '/pages/cliente/dashboard_cliente.html';
            } else if (pathname.includes('/taller/')) {
                window.location.href = host + '/portal_taller.html';
            } else if (pathname.includes('/mecanico/')) {
                window.location.href = host + '/pages/mecanico/dashboard_mecanico.html';
            } else if (pathname.includes('detalle_taller.html')) {
                window.location.href = host + '/pages/cliente/dashboard_cliente.html';
            } else {
                window.location.href = host + '/index.html';
            }
        };
        btnHomeWrap.appendChild(btnHome);

        // Limpieza: quitamos los botones "Volver a..." manuales del HTML original para no duplicar a la izquierda
        // Ocultamos `.back-link` de detalle_taller etc
        document.querySelectorAll('.back-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.back-to-dashboard').forEach(el => el.style.display = 'none');

        // INYECCIÓN ROBUSTA
        // En vez de tratar de atinarle a logoContainer, inyectamos violentamente al principio y final del header
        // Esto garantiza que la flecha esté a la izquierda EXTRAMA y la casa a la DERECHA EXTRAMA, no importa qué tan feo sea el header.

        // 1. Inyectar Flecha como PRIMERO hijo del header
        header.insertBefore(btnBackWrap, header.firstChild);

        // 2. Inyectar Casita como ÚLTIMO hijo del header (Omitir en páginas de login)
        if (!isLogin) {
            header.appendChild(btnHomeWrap);
        }

        // Si el contenedor que envuelve al logo (o el logo mismo) existe, nos aseguramos que se centre
        const logoImg = document.querySelector('img.logo') || document.querySelector('.logo img') || document.querySelector('.logo') || document.querySelector('img[src*="Logo_Autoguest"]');
        if (logoImg) {
            let logoContainer = logoImg.closest('a') ? logoImg.closest('a') : logoImg;
            // Opcional: asegurarnos que no choque con la flecha
            logoContainer.style.marginLeft = '10px';

            // Hacer que el logo tenga el mismo comportamiento que la flecha de regreso
            logoContainer.style.cursor = 'pointer';
            logoContainer.title = "Atrás";
            logoContainer.onclick = (e) => {
                e.preventDefault();
                window.history.back();
            };
        }
    }
});
