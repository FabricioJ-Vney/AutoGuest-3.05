import os

# Append to HTML
html_file = 'c:/Users/chabl/OneDrive/Documentos/AutoguestApp/App_web/pages/taller/gestionar_citas.html'
modal_html = """

    <!-- Modal de Chat (Taller - Solo Lectura) -->
    <div class="modal-overlay" id="chatModal">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Chat con Cliente (Solo Lectura)</h2>
                <button class="close-btn" id="closeChatModalBtn">&times;</button>
            </div>
            <div id="chatMessages" style="height: 300px; overflow-y: auto; background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                <!-- Messages go here -->
                <p style="color:#aaa; text-align:center;">Cargando mensajes...</p>
            </div>
            <div style="background: rgba(243, 156, 18, 0.1); padding: 10px; border-radius: 5px; border-left: 3px solid #f39c12; color: #f0f0f0; font-size: 0.9em;">
                <i class="fas fa-info-circle" style="color: #f39c12; margin-right: 5px;"></i>
                Como administrador del taller, solo puedes supervisar esta conversación.
            </div>
        </div>
    </div>
"""

with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

if "id=\"chatModal\"" not in html_content:
    html_content = html_content.replace('</body>', modal_html + '\n</body>')
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("Added chat modal to HTML.")

# Append to JS
js_file = 'c:/Users/chabl/OneDrive/Documentos/AutoguestApp/App_web/pages/taller/citas-admin.js'
chat_js = """

// --- LÓGICA DEL CHAT SUPERVISIÓN ---
function abrirChatAdmin(idCita, clienteNombre) {
    const modal = document.getElementById('chatModal');
    if(modal) {
        modal.querySelector('h2').textContent = `Chat de Cita: ${idCita} - Cliente: ${clienteNombre || ''}`;
        modal.style.display = 'flex';
        modal.classList.add('active');
        cargarMensajesChat(idCita);
    }
}

async function cargarMensajesChat(idCita) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<p style="color:#aaa; text-align:center;">Cargando mensajes...</p>';
    
    try {
        const res = await fetch(`/api/chat/${idCita}`);
        if(!res.ok) throw new Error('Error al cargar chat');
        
        const mensajes = await res.json();
        
        if(mensajes.length === 0) {
            container.innerHTML = '<p style="color:#aaa; text-align:center;">No hay mensajes en este chat.</p>';
            return;
        }
        
        container.innerHTML = mensajes.map(msg => {
            const esMecanico = msg.remitenteTipo === 'mecanico';
            const align = esMecanico ? 'align-self: flex-start; background: #2c3e50;' : 'align-self: flex-end; background: #e67e22; color: #1a1a1a;';
            const labelColor = esMecanico ? '#a0a0a0' : '#333';
            
            let contentText = msg.contenido;
            if(msg.tipoContenido === 'imagen') {
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
        
    } catch(e) {
        console.error(e);
        container.innerHTML = '<p style="color:#e74c3c; text-align:center;">Error al cargar los mensajes.</p>';
    }
}

// Cerrar modal de chat
document.addEventListener('DOMContentLoaded', () => {
    const closeChatBtn = document.getElementById('closeChatModalBtn');
    if(closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            const modal = document.getElementById('chatModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
});

// Extender el click outside para cerrar también el chat modal
const originalWindowOnClick = window.onclick;
window.onclick = (event) => {
    if(originalWindowOnClick) originalWindowOnClick(event);
    const chatModal = document.getElementById('chatModal');
    if (chatModal && event.target == chatModal) {
        chatModal.style.display = "none";
        chatModal.classList.remove('active');
    }
};
"""

with open(js_file, 'r', encoding='utf-8') as f:
    js_content = f.read()

if "abrirChatAdmin" not in js_content:
    with open(js_file, 'a', encoding='utf-8') as f:
        f.write(chat_js)
    print("Added chat logic to JS.")
