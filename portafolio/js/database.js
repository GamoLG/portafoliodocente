const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

// Ruta al archivo portafolio.db existente
const dbPath = path.join(__dirname, "portafolio.db");

// Conexión a la base de datos existente
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite en", dbPath);
  }
});

// Función para inicializar tablas (solo si no existen)
const initDB = () => {
  db.serialize(() => {
    // Verificar si la tabla users ya existe
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      (err, row) => {
        if (err) {
          console.error("Error al verificar tablas:", err);
          return;
        }

        // Si no existe la tabla users, crear todas las tablas
        if (!row) {
          console.log("Inicializando tablas de la base de datos...");

          // Tabla de usuarios
          db.run(`CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('admin', 'docente', 'evaluador')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

          // Tabla de semestres
          db.run(`CREATE TABLE semesters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    period TEXT NOT NULL,
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

          // Tabla de cursos
          db.run(`CREATE TABLE courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT NOT NULL,
                    semester_id INTEGER,
                    docente_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (semester_id) REFERENCES semesters (id),
                    FOREIGN KEY (docente_id) REFERENCES users (id)
                )`);

          // Tabla de portafolios
          db.run(`CREATE TABLE portfolios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_id INTEGER,
                    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'completado', 'revisado', 'evaluado')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (course_id) REFERENCES courses (id)
                )`);

          // Tabla de archivos
          db.run(`CREATE TABLE files (
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
                )`);

          // Tabla de evaluaciones
          db.run(`CREATE TABLE evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    portfolio_id INTEGER,
                    evaluator_id INTEGER,
                    comments TEXT,
                    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
                    FOREIGN KEY (evaluator_id) REFERENCES users (id)
                )`);

          // Crear usuario administrador por defecto
          const adminEmail = "admin@universidad.edu";
          const adminPassword = bcrypt.hashSync("admin123", 10);

          db.run(
            `INSERT INTO users (email, password, name, role) 
                        VALUES (?, ?, ?, ?)`,
            [adminEmail, adminPassword, "Administrador", "admin"],
            function (err) {
              if (err) {
                console.error("Error al crear usuario admin:", err);
              } else {
                console.log(
                  "Usuario administrador creado con ID:",
                  this.lastID
                );
              }
            }
          );
        }
      }
    );
  });
};

// Exportar la conexión y la función de inicialización
module.exports = { db, initDB };
