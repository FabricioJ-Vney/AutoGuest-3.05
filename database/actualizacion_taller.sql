-- Actualización para tabla mecanico
ALTER TABLE mecanico 
ADD COLUMN estado_solicitud ENUM('PENDIENTE', 'APROBADO') DEFAULT 'PENDIENTE';

-- Actualización para tabla taller
ALTER TABLE taller
ADD COLUMN foto_perfil VARCHAR(255) DEFAULT NULL;
