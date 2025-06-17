  const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

// Ruta a la base de datos
const dbPath = path.join(__dirname, "portafolio.db");
const db = new sqlite3.Database(dbPath);

const init = () => {
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'docente', 'evaluador')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de semestres
    db.run(`CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      period TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de cursos
    db.run(`CREATE TABLE IF NOT EXISTS courses (
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
    db.run(`CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'completado', 'revisado', 'evaluado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )`);

    // Tabla de archivos
    db.run(`CREATE TABLE IF NOT EXISTS files (
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
    db.run(`CREATE TABLE IF NOT EXISTS evaluations (
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

    db.get("SELECT id FROM users WHERE email = ?", [adminEmail], (err, row) => {
      if (err) {
        console.error("Error verificando usuario admin:", err);
      } else if (!row) {
        db.run(
          `INSERT INTO users (email, password, name, role) 
                VALUES (?, ?, ?, ?)`,
          [adminEmail, adminPassword, "Administrador", "admin"]
        );
        console.log(
          "Usuario administrador creado: admin@universidad.edu / admin123"
        );
      }
    });

    // Crear semestre de ejemplo
    db.get(
      "SELECT id FROM semesters WHERE year = 2024 AND period = '2024-I'",
      (err, row) => {
        if (err) {
          console.error("Error verificando semestre:", err);
        } else if (!row) {
          db.run(
            `INSERT INTO semesters (name, year, period) 
                VALUES (?, ?, ?)`,
            ["Semestre 2024-I", 2024, "2024-I"]
          );
          console.log("Semestre 2024-I creado.");
        }
      }
    );
  });
};

module.exports = { db, init };
