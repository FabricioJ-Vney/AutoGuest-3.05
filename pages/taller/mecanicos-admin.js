// Script para ver y gestionar mecánicos del taller
let allMecanicos = [];
let currentTab = 'activos'; // 'activos' o 'pendientes'

document.addEventListener('DOMContentLoaded', () => {
    console.log('Mecánicos admin loaded');

    // Configurar Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderMecanicos();
        });
    });

    cargarMecanicos();
});

// Cargar mecánicos desde el backend
async function cargarMecanicos() {
    try {
        const response = await fetch('/api/taller/mecanicos');

        if (!response.ok) {
            if (response.status === 401) {
                alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                window.location.href = '../../login_taller.html';
                return;
            }
            throw new Error('Error al cargar mecánicos');
        }

        allMecanicos = await response.json();
        actualizarEstadisticas();
        renderMecanicos();

    } catch (error) {
        console.error('Error:', error);
        mostrarError();
    }
}

// Renderizar según tab
function renderMecanicos() {
    const list = currentTab === 'activos'
        ? allMecanicos.filter(m => m.estado_solicitud === 'APROBADO')
        : allMecanicos.filter(m => m.estado_solicitud === 'PENDIENTE');

    mostrarMecanicos(list);
}

// Mostrar mecánicos en la página
function mostrarMecanicos(mecanicos) {
    const container = document.getElementById('mecanicos-container');

    if (!container) return;

    if (mecanicos.length === 0) {
        const msg = currentTab === 'activos' ? 'No hay mecánicos activos en tu taller' : 'No hay solicitudes pendientes';
        const icon = currentTab === 'activos' ? 'fa-users-slash' : 'fa-clipboard-list';
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas ${icon}"></i>
                <p>${msg}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mecanicos.map(mecanico => {
        // Obtener iniciales para el avatar
        const iniciales = mecanico.nombre
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        const accionesHtml = currentTab === 'activos'
            ? `<button class="btn-action btn-remove" onclick="removerMecanico('${mecanico.idUsuario}')"><i class="fas fa-user-times"></i> Dar de Baja</button>`
            : `<button class="btn-action btn-approve" onclick="aprobarMecanico('${mecanico.idUsuario}')"><i class="fas fa-check"></i> Aprobar</button>
               <button class="btn-action btn-remove" onclick="removerMecanico('${mecanico.idUsuario}')"><i class="fas fa-times"></i> Rechazar</button>`;

        return `
            <div class="mecanico-card">
                <div>
                    <div class="mecanico-header">
                        <div class="mecanico-avatar">${iniciales}</div>
                        <div class="mecanico-info">
                            <h3>${mecanico.nombre}</h3>
                            <p><i class="fas fa-wrench"></i> ${mecanico.especialidad || 'Mecánico General'}</p>
                        </div>
                    </div>
                    <div class="mecanico-details">
                        <div class="detail-item">
                            <i class="fas fa-id-badge"></i>
                            <span>ID: ${mecanico.idUsuario}</span>
                        </div>
                        <div class="detail-item" style="font-size: 0.9em;">
                            <i class="fas fa-envelope"></i>
                            <span>${mecanico.email || 'N/A'}</span>
                        </div>
                        <div class="detail-item" style="font-size: 0.9em;">
                            <i class="fas fa-phone"></i>
                            <span>${mecanico.telefono || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    ${accionesHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Aprobar mecánico
async function aprobarMecanico(idMecanico) {
    if (!confirm('¿Estás seguro de aprobar a este mecánico? Podrá acceder a las herramientas del taller.')) return;
    try {
        const res = await fetch(`/api/taller/mecanicos/${idMecanico}/aprobar`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            cargarMecanicos(); // Recargar datos
        } else {
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error conectando al servidor.');
    }
}

// Remover o rechazar mecánico
async function removerMecanico(idMecanico) {
    let msg = currentTab === 'activos'
        ? '¿Seguro que deseas dar de baja a este mecánico? Sus citas en proceso pasarán a estado "Pendiente".'
        : '¿Seguro que deseas rechazar y eliminar esta solicitud?';

    if (!confirm(msg)) return;

    try {
        const res = await fetch(`/api/taller/mecanicos/${idMecanico}/remover`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            cargarMecanicos(); // Recargar datos
        } else {
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error conectando al servidor.');
    }
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const aprobados = allMecanicos.filter(m => m.estado_solicitud === 'APROBADO');
    const pendientes = allMecanicos.filter(m => m.estado_solicitud === 'PENDIENTE');

    const totalElement = document.getElementById('total-mecanicos');
    if (totalElement) totalElement.textContent = aprobados.length;

    const pendientesElement = document.getElementById('pendientes-count');
    if (pendientesElement) pendientesElement.textContent = pendientes.length;
}

// Mostrar error
function mostrarError() {
    const container = document.getElementById('mecanicos-container');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar los mecánicos</p>
                <button class="btn" onclick="cargarMecanicos()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}
