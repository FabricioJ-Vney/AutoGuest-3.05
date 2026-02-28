/**
 * AutoGuest Notification System
 * Handles fetching, rendering and marking notifications as read
 */

const NotificationSystem = {
    init: function () {
        console.log("Notification System Initialized");
        this.fetchNotifications();
        // Polling every 60 seconds
        setInterval(() => this.fetchNotifications(), 60000);
    },

    fetchNotifications: async function () {
        try {
            const res = await fetch('/api/notificaciones');
            if (res.ok) {
                const notifications = await res.json();
                this.renderDropdown(notifications);
                this.updateBadge(notifications);
            }
        } catch (e) {
            console.error("Error fetching notifications", e);
        }
    },

    updateBadge: function (notifications) {
        const unreadCount = notifications.filter(n => !n.leida).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    renderDropdown: function (notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No tienes notificaciones</div>';
            return;
        }

        let html = '';
        notifications.forEach(n => {
            const date = new Date(n.fechaCreacion).toLocaleString();
            const unreadClass = n.leida ? '' : 'unread';
            const tipo = n.tipo || '';
            html += `
                <div class="notification-item ${unreadClass}" onclick="NotificationSystem.markAsRead(${n.idNotificacion}, '${tipo}')">
                    <div class="notification-icon">
                        <i class="${this.getIcon(n.titulo)}"></i>
                    </div>
                    <div class="notification-content">
                        <strong>${n.titulo || 'Notificación'}</strong>
                        <p>${n.mensaje}</p>
                        <span class="notification-time">${date}</span>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    },

    getIcon: function (title) {
        title = title.toLowerCase();
        if (title.includes('stock') || title.includes('agotado')) return 'fas fa-boxes text-danger';
        if (title.includes('cita') || title.includes('reserva') || title.includes('cotización')) return 'fas fa-calendar-alt text-warning';
        if (title.includes('pago') || title.includes('compra') || title.includes('venta')) return 'fas fa-cash-register text-success';
        if (title.includes('mecanico') || title.includes('perfil') || title.includes('taller')) return 'fas fa-user-cog text-info';
        return 'fas fa-bell text-primary';
    },

    markAsRead: async function (id, tipo) {
        try {
            const res = await fetch(`/api/notificaciones/${id}/leer`, { method: 'PUT' });
            if (res.ok) {
                this.fetchNotifications();
                if (tipo) this.handleRedirection(tipo);
            }
        } catch (e) {
            console.error("Error marking as read", e);
        }
    },

    handleRedirection: function (tipo) {
        if (!tipo) return;

        // Determinar la ruta base
        const isSubfolder = window.location.pathname.includes('/pages/');
        const prefix = isSubfolder ? '../../' : '';

        switch (tipo) {
            case 'mecanico':
                window.location.href = prefix + 'pages/taller/gestionar_mecanicos.html';
                break;
            case 'cita':
                if (window.location.pathname.includes('portal_mecanico.html')) {
                    location.reload();
                } else {
                    window.location.href = prefix + 'pages/taller/gestionar_citas.html';
                }
                break;
            case 'inventario':
                window.location.href = prefix + 'pages/taller/gestionar_inventario.html';
                break;
            case 'venta':
                window.location.href = prefix + 'pages/taller/punto_venta.html';
                break;
            default:
                console.log("No redirection for type:", tipo);
        }
    },

    toggleDropdown: function () {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NotificationSystem.init();

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const trigger = document.getElementById('notificationTrigger');
        if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});
