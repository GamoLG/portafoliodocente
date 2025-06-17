-- Base de datos para sistema de portafolios académicos

-- Tabla de usuarios
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'docente', 'evaluador')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de semestres
CREATE TABLE semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  period TEXT NOT NULL,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cursos
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  semester_id INTEGER,
  docente_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters (id),
  FOREIGN KEY (docente_id) REFERENCES users (id)
);

-- Tabla de portafolios
CREATE TABLE portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER,
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'completado', 'revisado', 'evaluado')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses (id)
);

-- Tabla de archivos
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER,
  category TEXT NOT NULL CHECK (category IN ('silabo', 'material', 'examenes', 'trabajos')),
  subcategory TEXT,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  quality_level TEXT CHECK (quality_level IN ('excelente', 'bueno', 'regular', 'pobre')),
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
  FOREIGN KEY (uploaded_by) REFERENCES users (id)
);

-- Tabla de evaluaciones
CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER,
  evaluator_id INTEGER,
  comments TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
  FOREIGN KEY (evaluator_id) REFERENCES users (id)
);