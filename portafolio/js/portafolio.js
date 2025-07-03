const { db } = require('./database.js');

/**
 * Crear un nuevo portafolio para un curso
 * @param {number} courseId - ID del curso
 * @returns {Promise<number>} ID del portafolio creado
 */
async function createPortfolio(courseId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO portfolios (course_id)
             VALUES (?)`,
            [courseId],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

/**
 * Obtener todos los portafolios de un curso
 * @param {number} courseId - ID del curso
 * @returns {Promise<Array>} Lista de portafolios
 */
async function getPortfoliosByCourse(courseId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT p.id, p.status, p.created_at, p.updated_at,
                    COUNT(f.id) as file_count
             FROM portfolios p
             LEFT JOIN files f ON p.id = f.portfolio_id
             WHERE p.course_id = ?
             GROUP BY p.id
             ORDER BY p.created_at DESC`,
            [courseId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Obtener detalles de un portafolio
 * @param {number} portfolioId - ID del portafolio
 * @returns {Promise<Object>} Detalles del portafolio
 */
async function getPortfolioDetails(portfolioId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT p.*, c.name as course_name, c.code as course_code,
                    s.name as semester_name, u.name as docente_name
             FROM portfolios p
             JOIN courses c ON p.course_id = c.id
             JOIN semesters s ON c.semester_id = s.id
             JOIN users u ON c.docente_id = u.id
             WHERE p.id = ?`,
            [portfolioId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

/**
 * Actualizar el estado de un portafolio
 * @param {number} portfolioId - ID del portafolio
 * @param {string} status - Nuevo estado ('borrador', 'completado', 'revisado', 'evaluado')
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
async function updatePortfolioStatus(portfolioId, status) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE portfolios 
             SET status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [status, portfolioId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

/**
 * Obtener portafolios pendientes de evaluación
 * @returns {Promise<Array>} Lista de portafolios pendientes
 */
async function getPendingPortfolios() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT p.id, p.status, p.created_at, p.updated_at,
                    c.name as course_name, c.code as course_code,
                    u.name as docente_name
             FROM portfolios p
             JOIN courses c ON p.course_id = c.id
             JOIN users u ON c.docente_id = u.id
             WHERE p.status IN ('completado', 'revisado')
             ORDER BY p.updated_at DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Crear una evaluación para un portafolio
 * @param {number} portfolioId - ID del portafolio
 * @param {number} evaluatorId - ID del evaluador
 * @param {string} comments - Comentarios de la evaluación
 * @param {number} rating - Calificación (1-5)
 * @returns {Promise<number>} ID de la evaluación creada
 */
async function createEvaluation(portfolioId, evaluatorId, comments, rating) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO evaluations (portfolio_id, evaluator_id, comments, rating, status)
             VALUES (?, ?, ?, ?, 'completada')`,
            [portfolioId, evaluatorId, comments, rating],
            function(err) {
                if (err) reject(err);
                else {
                    // Actualizar estado del portafolio a 'evaluado'
                    updatePortfolioStatus(portfolioId, 'evaluado')
                        .then(() => resolve(this.lastID))
                        .catch(reject);
                }
            }
        );
    });
}

/**
 * Obtener evaluaciones de un portafolio
 * @param {number} portfolioId - ID del portafolio
 * @returns {Promise<Array>} Lista de evaluaciones
 */
async function getPortfolioEvaluations(portfolioId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT e.*, u.name as evaluator_name
             FROM evaluations e
             JOIN users u ON e.evaluator_id = u.id
             WHERE e.portfolio_id = ?
             ORDER BY e.created_at DESC`,
            [portfolioId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports = {
    createPortfolio,
    getPortfoliosByCourse,
    getPortfolioDetails,
    updatePortfolioStatus,
    getPendingPortfolios,
    createEvaluation,
    getPortfolioEvaluations
};