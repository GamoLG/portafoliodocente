const { db } = require('./database.js');
const fs = require('fs');
const path = require('path');

// Configuración de la carpeta de uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Subir un archivo al portafolio
 * @param {number} portfolioId - ID del portafolio
 * @param {string} category - Categoría del archivo
 * @param {string} subcategory - Subcategoría (opcional)
 * @param {Object} file - Objeto File del input
 * @param {string} qualityLevel - Nivel de calidad (para trabajos estudiantiles)
 * @param {number} userId - ID del usuario que sube el archivo
 * @returns {Promise<number>} ID del archivo creado
 */
async function uploadFile(portfolioId, category, subcategory, file, qualityLevel, userId) {
    return new Promise((resolve, reject) => {
        // Validar tamaño del archivo (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('El archivo excede el límite de 5MB'));
            return;
        }

        // Generar nombre único para el archivo
        const fileExt = path.extname(file.name);
        const fileName = `file_${Date.now()}${fileExt}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Mover el archivo a la carpeta de uploads
        fs.writeFile(filePath, file.data, async (err) => {
            if (err) {
                reject(new Error('Error al guardar el archivo'));
                return;
            }

            // Guardar metadatos en la base de datos
            db.run(
                `INSERT INTO files (
                    portfolio_id, category, subcategory, 
                    original_name, file_name, file_path, 
                    file_size, mime_type, quality_level, uploaded_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    portfolioId,
                    category,
                    subcategory || null,
                    file.name,
                    fileName,
                    `/uploads/${fileName}`,
                    file.size,
                    file.type,
                    qualityLevel || null,
                    userId
                ],
                function(err) {
                    if (err) {
                        // Si hay error en la BD, eliminar el archivo subido
                        fs.unlink(filePath, () => {});
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    });
}

/**
 * Obtener archivos de un portafolio
 * @param {number} portfolioId - ID del portafolio
 * @returns {Promise<Array>} Lista de archivos
 */
async function getPortfolioFiles(portfolioId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, original_name, category, subcategory, 
                    file_size, mime_type, quality_level, created_at
             FROM files
             WHERE portfolio_id = ?
             ORDER BY created_at DESC`,
            [portfolioId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Eliminar un archivo
 * @param {number} fileId - ID del archivo a eliminar
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function deleteFile(fileId) {
    return new Promise((resolve, reject) => {
        // Primero obtener información del archivo para eliminarlo del sistema de archivos
        db.get(
            `SELECT file_name FROM files WHERE id = ?`,
            [fileId],
            (err, file) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!file) {
                    reject(new Error('Archivo no encontrado'));
                    return;
                }

                // Eliminar el archivo físico
                const filePath = path.join(UPLOAD_DIR, file.file_name);
                fs.unlink(filePath, (err) => {
                    if (err && err.code !== 'ENOENT') { // Ignorar si el archivo ya no existe
                        reject(err);
                        return;
                    }

                    // Eliminar el registro de la base de datos
                    db.run(
                        `DELETE FROM files WHERE id = ?`,
                        [fileId],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.changes > 0);
                        }
                    );
                });
            }
        );
    });
}

/**
 * Obtener información de un archivo
 * @param {number} fileId - ID del archivo
 * @returns {Promise<Object>} Información del archivo
 */
async function getFileInfo(fileId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM files WHERE id = ?`,
            [fileId],
            (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Archivo no encontrado'));
                else resolve(row);
            }
        );
    });
}

/**
 * Descargar/ver un archivo
 * @param {number} fileId - ID del archivo
 * @returns {Promise<Object>} Objeto con el stream del archivo y metadatos
 */
async function downloadFile(fileId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT original_name, file_name, mime_type 
             FROM files 
             WHERE id = ?`,
            [fileId],
            (err, file) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!file) {
                    reject(new Error('Archivo no encontrado'));
                    return;
                }

                const filePath = path.join(UPLOAD_DIR, file.file_name);
                fs.access(filePath, fs.constants.R_OK, (err) => {
                    if (err) {
                        reject(new Error('Archivo no disponible'));
                        return;
                    }

                    resolve({
                        path: filePath,
                        originalName: file.original_name,
                        mimeType: file.mime_type
                    });
                });
            }
        );
    });
}

module.exports = {
    uploadFile,
    getPortfolioFiles,
    deleteFile,
    getFileInfo,
    downloadFile
};