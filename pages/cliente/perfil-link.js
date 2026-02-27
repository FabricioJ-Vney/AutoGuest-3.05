// Script para agregar enlace de perfil al dashboard del cliente
// Incluir este archivo en dashboard_cliente.html con: <script src="perfil-link.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile link integration loaded');

    // Buscar el contenedor de tarjetas del dashboard
    const dashboardGrid = document.querySelector('.dashboard-content') ||
        document.querySelector('.dashboard-grid') ||
        document.querySelector('.cards-container') ||
        document.querySelector('.dashboard-cards');

    if (!dashboardGrid) {
        console.error('No se encontró el contenedor de tarjetas del dashboard');
        return;
    }

    // Verificar si ya existe la tarjeta de perfil
    const existingProfileCard = document.querySelector('[href="perfil_cliente.html"]') ||
        document.getElementById('card-perfil');

    if (existingProfileCard) {
        console.log('La tarjeta de perfil ya existe');
        return;
    }

    // Crear tarjeta de perfil
    const perfilCard = document.createElement('div');
    perfilCard.className = 'dashboard-card';
    perfilCard.id = 'card-perfil';
    perfilCard.style.cursor = 'pointer';

    perfilCard.innerHTML = `
        <div class="card-icon">
            <i class="fas fa-user-circle"></i>
        </div>
        <div class="card-content">
            <h3>Mi Perfil</h3>
            <p>Gestiona tu información personal</p>
        </div>
    `;

    // Agregar evento click
    perfilCard.addEventListener('click', () => {
        window.location.href = 'perfil_cliente.html';
    });

    // Insertar la tarjeta en el dashboard
    // Intentar insertarla después de la tarjeta de vehículos si existe
    const vehiculosCard = document.getElementById('card-vehiculos') ||
        document.querySelector('[onclick*="gestionar_vehiculos"]');

    if (vehiculosCard && vehiculosCard.parentNode) {
        vehiculosCard.parentNode.insertBefore(perfilCard, vehiculosCard.nextSibling);
    } else {
        // Si no se encuentra, agregar al final
        dashboardGrid.appendChild(perfilCard);
    }

    console.log('Tarjeta de perfil agregada al dashboard');
});
