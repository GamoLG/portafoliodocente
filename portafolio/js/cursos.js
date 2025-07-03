const { db } = require('./database.js');

/**
 * Obtener todos los cursos con información del semestre
 * @returns {Promise<Array>} Lista de cursos
 */
async function getAllCourses() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT c.id, c.name, c.code, s.name as semester_name, 
                    s.year, s.period, u.name as docente_name
             FROM courses c
             LEFT JOIN semesters s ON c.semester_id = s.id
             LEFT JOIN users u ON c.docente_id = u.id
             ORDER BY s.year DESC, s.period, c.name`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Crear un nuevo curso
 * @param {string} name - Nombre del curso
 * @param {string} code - Código del curso
 * @param {number} semesterId - ID del semestre
 * @param {number} docenteId - ID del docente asignado
 * @returns {Promise<number>} ID del curso creado
 */
async function createCourse(name, code, semesterId, docenteId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO courses (name, code, semester_id, docente_id)
             VALUES (?, ?, ?, ?)`,
            [name, code, semesterId, docenteId],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

/**
 * Actualizar un curso existente
 * @param {number} id - ID del curso
 * @param {string} name - Nuevo nombre del curso
 * @param {string} code - Nuevo código del curso
 * @param {number} semesterId - Nuevo ID del semestre
 * @param {number} docenteId - Nuevo ID del docente
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
async function updateCourse(id, name, code, semesterId, docenteId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE courses 
             SET name = ?, code = ?, semester_id = ?, docente_id = ?
             WHERE id = ?`,
            [name, code, semesterId, docenteId, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

/**
 * Eliminar un curso
 * @param {number} id - ID del curso a eliminar
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function deleteCourse(id) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM courses WHERE id = ?`,
            [id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

/**
 * Obtener todos los semestres
 * @returns {Promise<Array>} Lista de semestres
 */
async function getAllSemesters() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, name, year, period, active
             FROM semesters
             ORDER BY year DESC, period`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Obtener todos los docentes
 * @returns {Promise<Array>} Lista de docentes
 */
async function getAllTeachers() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, name, email 
             FROM users 
             WHERE role = 'docente'
             ORDER BY name`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Obtener cursos asignados a un docente
 * @param {number} teacherId - ID del docente
 * @returns {Promise<Array>} Lista de cursos del docente
 */
async function getCoursesByTeacher(teacherId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT c.id, c.name, c.code, s.name as semester_name
             FROM courses c
             JOIN semesters s ON c.semester_id = s.id
             WHERE c.docente_id = ?
             ORDER BY s.year DESC, s.period, c.name`,
            [teacherId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports = {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getAllSemesters,
    getAllTeachers,
    getCoursesByTeacher
};