-- Crear base de datos
CREATE DATABASE IF NOT EXISTS portafolio_docente CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portafolio_docente;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('administrador', 'docente', 'evaluador') NOT NULL,
    codigo_docente VARCHAR(20) UNIQUE NULL, -- Solo para docentes
    estado ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    avatar_url VARCHAR(255) NULL,
    telefono VARCHAR(20) NULL,
    
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_estado (estado)
);

-- Tabla de semestres académicos
CREATE TABLE semestres (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL, -- Ej: "2025-I", "2025-II"
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('planificado', 'activo', 'finalizado') DEFAULT 'planificado',
    descripcion TEXT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_estado (estado),
    INDEX idx_fechas (fecha_inicio, fecha_fin)
);

-- Tabla de cursos
CREATE TABLE cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL, -- Ej: "CS101"
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT NULL,
    creditos INT NOT NULL DEFAULT 3,
    semestre_id INT NOT NULL,
    docente_id INT NOT NULL,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (semestre_id) REFERENCES semestres(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX idx_codigo (codigo),
    INDEX idx_semestre (semestre_id),
    INDEX idx_docente (docente_id),
    UNIQUE KEY unique_curso_semestre (codigo, semestre_id)
);

-- Tabla de portafolios
CREATE TABLE portafolios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    curso_id INT NOT NULL,
    estado ENUM('borrador', 'en_revision', 'aprobado', 'rechazado') DEFAULT 'borrador',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP NULL, -- Cuando se envía para revisión
    fecha_revision TIMESTAMP NULL, -- Cuando se completa la revisión
    evaluador_id INT NULL,
    comentarios_evaluacion TEXT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX idx_curso (curso_id),
    INDEX idx_estado (estado),
    INDEX idx_evaluador (evaluador_id)
);

-- Tabla de categorías de documentos
CREATE TABLE categorias_documento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL, -- Ej: "Sílabo", "Material de Enseñanza", "Exámenes"
    descripcion TEXT NULL,
    orden INT NOT NULL DEFAULT 0, -- Para ordenar en la interfaz
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    
    INDEX idx_orden (orden)
);

-- Tabla de subcategorías
CREATE TABLE subcategorias_documento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    categoria_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL, -- Ej: "Diapositivas", "Guías", "Prácticas"
    descripcion TEXT NULL,
    orden INT NOT NULL DEFAULT 0,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    
    FOREIGN KEY (categoria_id) REFERENCES categorias_documento(id) ON DELETE CASCADE,
    
    INDEX idx_categoria (categoria_id),
    INDEX idx_orden (orden)
);

-- Tabla de archivos/documentos
CREATE TABLE documentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    portafolio_id INT NOT NULL,
    categoria_id INT NOT NULL,
    subcategoria_id INT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL, -- Nombre en el sistema de archivos
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamaño_bytes INT NOT NULL,
    extension VARCHAR(10) NOT NULL,
    descripcion TEXT NULL,
    clasificacion ENUM('excelente', 'bueno', 'regular', 'pobre') NULL, -- Para trabajos estudiantiles
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subido_por INT NOT NULL,
    
    FOREIGN KEY (portafolio_id) REFERENCES portafolios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias_documento(id) ON DELETE RESTRICT,
    FOREIGN KEY (subcategoria_id) REFERENCES subcategorias_documento(id) ON DELETE SET NULL,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX idx_portafolio (portafolio_id),
    INDEX idx_categoria (categoria_id),
    INDEX idx_subcategoria (subcategoria_id),
    INDEX idx_fecha_subida (fecha_subida)
);

-- Tabla de comentarios/retroalimentación
CREATE TABLE comentarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    portafolio_id INT NOT NULL,
    documento_id INT NULL, -- NULL para comentarios generales del portafolio
    evaluador_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('general', 'documento', 'sugerencia', 'correccion') DEFAULT 'general',
    estado ENUM('pendiente', 'resuelto', 'ignorado') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP NULL,
    
    FOREIGN KEY (portafolio_id) REFERENCES portafolios(id) ON DELETE CASCADE,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX idx_portafolio (portafolio_id),
    INDEX idx_documento (documento_id),
    INDEX idx_evaluador (evaluador_id),
    INDEX idx_tipo (tipo),
    INDEX idx_estado (estado)
);

-- Tabla de logs/auditoría
CREATE TABLE logs_auditoria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL, -- Ej: "upload_document", "delete_portfolio"
    tabla_afectada VARCHAR(50) NOT NULL,
    registro_id INT NULL,
    datos_anteriores JSON NULL,
    datos_nuevos JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX idx_usuario (usuario_id),
    INDEX idx_accion (accion),
    INDEX idx_tabla (tabla_afectada),
    INDEX idx_fecha (fecha_accion)
);

-- Tabla de configuraciones del sistema
CREATE TABLE configuraciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NULL,
    tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    descripcion TEXT NULL,
    categoria VARCHAR(50) DEFAULT 'general',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_categoria (categoria)
);

-- Insertar datos iniciales

-- Configuraciones del sistema
INSERT INTO configuraciones (clave, valor, tipo, descripcion, categoria) VALUES 
('max_file_size', '5242880', 'number', 'Tamaño máximo de archivo en bytes (5MB)', 'archivos'),
('allowed_extensions', 'pdf,doc,docx,ppt,pptx,xls,xlsx,png,jpg,jpeg,gif,txt,zip,rar', 'string', 'Extensiones de archivo permitidas', 'archivos'),
('sistema_nombre', 'Portafolio Docente UNSAAC', 'string', 'Nombre del sistema', 'general'),
('sistema_version', '1.0.0', 'string', 'Versión del sistema', 'general');

-- Categorías de documentos
INSERT INTO categorias_documento (nombre, descripcion, orden) VALUES 
('Sílabo', 'Documento que contiene el plan de estudios del curso', 1),
('Material de Enseñanza', 'Diapositivas, guías, lecturas y material didáctico', 2),
('Asignaciones y Exámenes', 'Ejemplos de tareas, proyectos y evaluaciones', 3),
('Trabajos Estudiantiles', 'Muestras de trabajos de estudiantes clasificados por calidad', 4),
('Evaluaciones', 'Instrumentos y criterios de evaluación', 5),
('Recursos Adicionales', 'Material complementario y recursos externos', 6);

-- Subcategorías
INSERT INTO subcategorias_documento (categoria_id, nombre, descripcion, orden) VALUES 
-- Material de Enseñanza
(2, 'Diapositivas', 'Presentaciones utilizadas en clase', 1),
(2, 'Guías de Práctica', 'Guías para laboratorios y prácticas', 2),
(2, 'Lecturas', 'Material de lectura obligatorio y complementario', 3),
(2, 'Videos y Multimedia', 'Contenido audiovisual educativo', 4),

-- Asignaciones y Exámenes
(3, 'Tareas', 'Asignaciones regulares del curso', 1),
(3, 'Proyectos', 'Proyectos y trabajos extensos', 2),
(3, 'Exámenes Parciales', 'Evaluaciones de medio término', 3),
(3, 'Exámenes Finales', 'Evaluaciones finales del curso', 4),

-- Trabajos Estudiantiles (estas se usarán con la clasificación)
(4, 'Trabajos Finales', 'Proyectos de fin de curso', 1),
(4, 'Reportes de Laboratorio', 'Informes de prácticas de laboratorio', 2),
(4, 'Ensayos y Análisis', 'Trabajos escritos y análisis críticos', 3);

-- Usuario administrador por defecto (contraseña: admin123)
INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol) VALUES 
('Administrador', 'del Sistema', 'admin@unsaac.edu.pe', '$2a$10$rOvD7zYjlBKV9wHwD6pOJON7J8t5BaF2c5E1X9ypQ7K2mN3oP4qR6', 'administrador');

-- Semestre actual
INSERT INTO semestres (nombre, fecha_inicio, fecha_fin, estado, descripcion) VALUES 
('2025-I', '2025-03-15', '2025-07-31', 'activo', 'Primer semestre académico 2025');