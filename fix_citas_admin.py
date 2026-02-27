import os

filepath = 'c:/Users/chabl/OneDrive/Documentos/AutoguestApp/App_web/pages/taller/citas-admin.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                    <button class="btn" onclick="verDetalles('${cita.idCita}')" style="padding: 8px 12px; font-size: 14px;">Detalles</button>"""
replacement = """                    <button class="btn" onclick="verDetalles('${cita.idCita}')" style="padding: 8px 12px; font-size: 14px;">Detalles</button>
                    <!-- BOTÓN VER CHAT (Taller) -->
                    <button class="btn" onclick="abrirChatAdmin('${cita.idCita}', '${cita.clienteNombre}')" style="padding: 8px 12px; font-size: 14px; background-color: #3498db; margin-left: 5px;">
                        <i class="fas fa-comments"></i> Chat
                    </button>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target string not found in file")
