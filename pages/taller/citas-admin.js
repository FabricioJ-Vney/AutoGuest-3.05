// Script para gestionar citas del taller
let allCitas = [];
let currentFilter = 'Pendiente';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Citas admin loaded');

    // Configurar filtros
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic Update
            currentFilter = btn.dataset.filter;
            aplicarFiltros();
        });
    });

    // Cargar citas y mecánicos
    cargarCitas();
    cargarMecanicos();
});

// Cargar todas las citas del taller
async function cargarCitas() {
    try {
        const response = await fetch('/api/taller/citas');

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login_taller.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Error al cargar citas');
        }

        allCitas = await response.json();
        aplicarFiltros();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar citas');
    }
}

function aplicarFiltros() {
    const filtered = allCitas.filter(cita => {
        const s = cita.estado;
        if (currentFilter === 'Pendiente') {
            return ['Pendiente', 'Pendiente de Cotización', 'Cotizado', 'En Proceso', 'Esperando Confirmacion Cliente'].includes(s);
        } else if (currentFilter === 'Completado') {
            return ['Completado', 'Entregado'].includes(s);
        } else if (currentFilter === 'Cancelada') {
            return ['Cancelado', 'Rechazado'].includes(s);
        }
        return true;
    });
    mostrarCitas(filtered);
}

// Mostrar citas en la tabla
function mostrarCitas(citas) {
    const tbody = document.querySelector('#citas-table tbody') || document.querySelector('#appointmentsTableBody'); // Support both IDs

    if (!tbody) return;

    if (citas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">No hay citas en esta categoría</td></tr>';
        return;
    }

    tbody.innerHTML = citas.map(cita => {
        const fecha = new Date(cita.fechaHora).toLocaleDateString('es-ES');
        const hora = new Date(cita.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Logic for mechanic select: if manual assignment is needed
        // Assuming mechanic select population happens via `cargarMecanicos` later
        const isFinished = (cita.estado === 'Completado' || cita.estado === 'Cancelado' || cita.estado === 'Esperando Confirmacion Cliente' || cita.estado === 'Entregado');

        return `
            <tr>
                <td>
                    ${cita.idCita} 
                    <button onclick="navigator.clipboard.writeText('${cita.idCita}'); alert('ID Copiado');" style="background:none; border:none; color:#f39c12; cursor:pointer;" title="Copiar ID"><i class="fas fa-copy"></i></button>
                </td>
                <td>${fecha} ${hora}</td>
                <td>${cita.clienteNombre}</td>
                <td>${cita.marca} (${cita.placa})</td>
                <td>
                    <select class="select-mecanico" data-cita-id="${cita.idCita}" data-mecanico-actual="${cita.idMecanico}" ${isFinished ? 'disabled' : ''}>
                        <option value="">Cargando...</option>
                    </select>
                </td>
                <td><span class="status-badge status-${cita.estado.replace(/\s+/g, '')}">${cita.estado}</span></td>
                <td>
                    <button class="btn-cambiar-mecanico" onclick="cambiarMecanico('${cita.idCita}')" title="Guardar Mecánico" ${isFinished ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="btn" onclick="verDetalles('${cita.idCita}')" style="padding: 8px 12px; font-size: 14px;">Detalles</button>
                    <!-- BOTÓN VER CHAT (Taller) -->
                    <button class="btn" onclick="abrirChatAdmin('${cita.idCita}', '${cita.clienteNombre}')" style="padding: 8px 12px; font-size: 14px; background-color: #3498db; margin-left: 5px;">
                        <i class="fas fa-comments"></i> Chat
                    </button>
                    ${!isFinished ?
                `<button class="btn-completar" onclick="completarCita('${cita.idCita}')" style="background-color: #2ecc71; margin-left: 5px;" title="Completar">
                            <i class="fas fa-check"></i>
                        </button>` : ''
            }
                </td>
            </tr>
        `;
    }).join('');

    // Re-populate mechanics dropdowns for these new rows
    if (typeof cargarMecanicos === 'function') {
        cargarMecanicos();
    }
}

// Cargar mecánicos disponibles
let mecanicosDisponibles = [];

async function cargarMecanicos() {
    try {
        const response = await fetch('/api/taller/mecanicos-activos');

        if (response.status === 401) {
            // No alertamos aquí para no spammear si se llama junto con otras funciones
            console.warn('Sesión expirada al cargar mecánicos');
            return;
        }

        if (!response.ok) {
            throw new Error('Error al cargar mecánicos');
        }

        mecanicosDisponibles = await response.json();

        // Actualizar todos los selects de mecánicos
        // Actualizar todos los selects de mecánicos
        document.querySelectorAll('.select-mecanico').forEach(select => {
            const mecanicoActual = select.dataset.mecanicoActual;

            let options = `<option value="" ${!mecanicoActual || mecanicoActual === 'null' ? 'selected' : ''}>-- Sin Asignar --</option>`;

            options += mecanicosDisponibles.map(mec =>
                `<option value="${mec.idUsuario}" ${mec.idUsuario === mecanicoActual ? 'selected' : ''}>
                    ${mec.nombre} - ${mec.especialidad}
                </option>`
            ).join('');

            select.innerHTML = options;
        });

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar mecánicos');
    }
}

// Cambiar mecánico asignado
async function cambiarMecanico(idCita) {
    const select = document.querySelector(`select[data-cita-id="${idCita}"]`);
    const nuevoMecanico = select.value;

    if (!nuevoMecanico) {
        alert('Por favor selecciona un mecánico');
        return;
    }

    try {
        const response = await fetch(`/api/taller/citas/${idCita}/mecanico`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idMecanico: nuevoMecanico })
        });

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login_taller.html';
            return;
        }

        const result = await response.json();

        if (response.ok) {
            alert(result.mensaje);
            cargarCitas();
        } else {
            alert(result.error || 'Error al cambiar mecánico');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar mecánico');
    }
}

// Cargar citas de hoy para el dashboard
async function cargarCitasHoy() {
    try {
        const response = await fetch('/api/taller/citas-hoy');

        if (response.status === 401) {
            // Si carga en dashboard, quizás redirigir
            return;
        }

        if (!response.ok) {
            throw new Error('Error al cargar citas de hoy');
        }

        const citas = await response.json();

        // Actualizar contador en el dashboard
        const contadorElement = document.getElementById('citas-hoy-count');
        if (contadorElement) {
            contadorElement.textContent = citas.length;
        }

        // Mostrar lista de citas de hoy
        const listaElement = document.getElementById('citas-hoy-lista');
        if (listaElement) {
            if (citas.length === 0) {
                listaElement.innerHTML = '<p style="color: #888;">No hay citas para hoy</p>';
            } else {
                listaElement.innerHTML = citas.map(cita => {
                    const hora = new Date(cita.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="cita-hoy-item">
                            <strong>${hora}</strong> - ${cita.clienteNombre}<br>
                            <small>${cita.marca} (${cita.placa}) - ${cita.mecanicoNombre}</small>
                        </div>
                    `;
                }).join('');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Completar cita
async function completarCita(idCita) {
    if (!confirm('¿Marcar esta cita como completada?')) {
        return;
    }

    try {
        const response = await fetch(`/api/taller/citas/${idCita}/completar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login_taller.html';
            return;
        }

        const result = await response.json();

        if (response.ok) {
            alert(result.mensaje || 'Cita completada exitosamente');
            cargarCitas(); // Recargar la lista
        } else {
            alert(result.error || 'Error al completar la cita');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al completar la cita');
    }
}

// Si estamos en el dashboard, cargar citas de hoy
if (window.location.pathname.includes('portal_taller')) {
    cargarCitasHoy();
}

// --- NUEVA FUNCION: VER DETALLES ---
window.verDetalles = async (idCita) => {
    const modal = document.getElementById('detailsModal');
    if (!modal) return console.error("No se encontró el modal detailsModal");

    try {
        // Podríamos hacer un fetch específico si no tenemos todos los datos,
        // pero por ahora intentaremos obtenerlo de la lista si ya la cargamos, 
        // O mejor, hacemos fetch individual para asegurar datos frescos.
        const res = await fetch(`/api/taller/citas/${idCita}`);
        if (!res.ok) throw new Error("Error cargando detalles");

        const cita = await res.json();

        // Llenar datos (ajusta los IDs según tu HTML)
        if (document.getElementById('modalCliente')) document.getElementById('modalCliente').textContent = cita.clienteNombre;
        if (document.getElementById('modalClienteEmail')) document.getElementById('modalClienteEmail').textContent = cita.clienteEmail || 'N/A';
        if (document.getElementById('modalVehiculo')) document.getElementById('modalVehiculo').textContent = `${cita.marca} ${cita.modelo}`;
        if (document.getElementById('modalPlaca')) document.getElementById('modalPlaca').textContent = cita.placa;
        if (document.getElementById('modalMecanico')) document.getElementById('modalMecanico').textContent = cita.mecanicoNombre || 'Sin asignar';
        if (document.getElementById('modalFecha')) document.getElementById('modalFecha').textContent = new Date(cita.fechaHora).toLocaleString();
        if (document.getElementById('modalEstado')) document.getElementById('modalEstado').textContent = cita.estado;

        modal.style.display = 'flex'; // Mostrar modal (usando flex para centrar según tu CSS)
        modal.classList.add('active'); // O usar clase active si tu CSS lo requiere

    } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los detalles.");
    }
};

// Cerrar modal
const closeModalBtn = document.getElementById('closeModalBtn');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        const modal = document.getElementById('detailsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    });
}

// Cerrar modal con click afuera
window.onclick = (event) => {
    const modal = document.getElementById('detailsModal');
    if (modal && event.target == modal) {
        modal.style.display = "none";
        modal.classList.remove('active');
    }

    // También cerrar el chat modal
    const chatModal = document.getElementById('chatModal');
    if (chatModal && event.target == chatModal) {
        chatModal.style.display = "none";
        chatModal.classList.remove('active');
    }
};

// --- LÓGICA DEL CHAT SUPERVISIÓN ---
window.abrirChatAdmin = function (idCita, clienteNombre) {
    const modal = document.getElementById('chatModal');
    if (modal) {
        modal.querySelector('h2').textContent = `Chat de Cita: ${idCita} - Cliente: ${clienteNombre || ''}`;
        modal.style.display = 'flex';
        modal.classList.add('active');
        cargarMensajesChat(idCita);
    }
};

async function cargarMensajesChat(idCita) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<p style="color:#aaa; text-align:center;">Cargando mensajes...</p>';

    try {
        const res = await fetch(`/api/chat/${idCita}`);
        if (!res.ok) throw new Error('Error al cargar chat');

        const mensajes = await res.json();

        if (mensajes.length === 0) {
            container.innerHTML = '<p style="color:#aaa; text-align:center;">No hay mensajes en este chat.</p>';
            return;
        }

        container.innerHTML = mensajes.map(msg => {
            const esMecanico = msg.remitenteTipo === 'mecanico';
            const align = esMecanico ? 'align-self: flex-start; background: #2c3e50;' : 'align-self: flex-end; background: #e67e22; color: #1a1a1a;';
            const labelColor = esMecanico ? '#a0a0a0' : '#333';

            let contentText = msg.contenido;
            if (msg.tipoContenido === 'imagen') {
                contentText = `<img src="${msg.contenido}" style="max-width: 100%; border-radius: 5px; margin-top: 5px;">`;
            }

            return `
                <div style="max-width: 70%; padding: 10px 15px; border-radius: 8px; ${align}">
                    <div style="font-size: 0.8em; color: ${labelColor}; margin-bottom: 5px; font-weight: bold;">
                        ${msg.remitenteNombre} (${msg.remitenteTipo})
                    </div>
                    <div>${contentText}</div>
                    <div style="font-size: 0.7em; color: ${labelColor}; opacity: 0.8; margin-top: 5px; text-align: right;">
                        ${new Date(msg.fechaEnvio).toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:#e74c3c; text-align:center;">Error al cargar los mensajes.</p>';
    }
}

// Cerrar modal de chat
document.addEventListener('DOMContentLoaded', () => {
    const closeChatBtn = document.getElementById('closeChatModalBtn');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            const modal = document.getElementById('chatModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
});
