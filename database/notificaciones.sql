CREATE TABLE IF NOT EXISTS notificacion (
    idNotificacion INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario VARCHAR(50) NOT NULL, -- FK a la tabla usuario (puede ser cliente, taller o mecanico)
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE
);
