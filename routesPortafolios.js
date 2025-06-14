const express = require('express');
const { executeQuery, executeTransaction } = require('../database/connection');
const { auth, requireDocente, requireEvaluador, requireAdmin } = require('../middleware/auth');
const { validateId, validatePagination, validateComentario } = require('../middleware/validation');
const router = express.Router();

// OBTENER TODOS LOS PORTAFOLIOS (con filtros y paginación)
router.get('/', auth, validatePagination, async (req, res) => {
    try {
        const { page, limit, search, sortBy, sortOrder } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        let queryParams = [];
        
        // Filtrar según el rol del usuario
        if (req.user.rol === 'docente') {
            whereClause += ' AND c.docente_id = ?';
            queryParams.push(req.user.userId);
        } else if (req.user.rol === 'evaluador') {
            whereClause += ' AND (p.evaluador_id = ? OR p.estado = "en_revision")';
            queryParams.push(req.user.userId);
        }
        
        // Búsqueda por texto
        if (search) {
            whereClause += ' AND (c.nombre LIKE ? OR c.codigo LIKE ? OR s.nombre LIKE ?)';
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }
        
        // Ordenamiento
        let orderClause = 'p.fecha_actualizacion DESC';
        if (sortBy) {
            const validSortFields = ['fecha_creacion', 'fecha_actualizacion', 'estado', 'curso_nombre'];
            if (validSortFields.includes(sortBy)) {
                orderClause = `${sortBy === 'curso_nombre' ? 'c.nombre' : 'p.' + sortBy} ${sortOrder}`;
            }
        }
        
        // Consulta principal
        const query = `
            SELECT 
                p.id,
                p.estado,
                p.fecha_creacion,
                p.fecha_actualizacion,
                p.fecha_envio,
                p.fecha_revision,
                p.version,
                c.id as curso_id,
                c.codigo as curso_codigo,
                c.nombre as curso_nombre,
                c.creditos,
                s.nombre as semestre_nombre,
                u_docente.nombres as docente_nombres,
                u_docente.apellidos as docente_apellidos,
                u_evaluador.nombres as evaluador_nombres,
                u_evaluador.apellidos as evaluador_apellidos,
                (SELECT COUNT(*) FROM documentos WHERE portafolio_id = p.id) as total_documentos
            FROM portafolios p
            INNER JOIN cursos c ON p.curso_id = c.id
            INNER JOIN semestres s ON c.semestre_id = s.id
            INNER JOIN usuarios u_docente ON c.docente_id = u_docente.id
            LEFT JOIN usuarios u_evaluador ON p.evaluador_id = u_evaluador.id
            WHERE ${whereClause}
            ORDER BY ${orderClause}
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(limit, offset);
        
        const portafolios = await executeQuery(query, queryParams);
        
        // Contar total de registros
        const countQuery = `
            SELECT COUNT(*) as total
            FROM portafolios p
            INNER JOIN cursos c ON p.curso_id = c.id
            INNER JOIN semestres s ON c.semestre_id = s.id
            WHERE ${whereClause}
        `;
        
        const countParams = queryParams.slice(0, -2); // Remover limit y offset
        const totalResult = await executeQuery(countQuery, countParams);
        const total = totalResult[0].total;
        
        res.json({
            success: true,
            data: {
                portafolios,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo portafolios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// OBTENER PORTAFOLIO POR ID
router.get('/:id', auth, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                p.*,
                c.id as curso_id,
                c.codigo as curso_codigo,
                c.nombre as curso_nombre,
                c.descripcion as curso_descripcion,
                c.creditos,
                s.nombre as semestre_nombre,
                s.fecha_inicio as semestre_inicio,
                s.fecha_fin as semestre_fin,
                u_docente.nombres as docente_nombres,
                u_docente.apellidos as docente_apellidos,
                u_docente.email as docente_email,
                u_evaluador.nombres as evaluador_nombres,
                u_evaluador.apellidos as evaluador_apellidos
            FROM portafolios p
            INNER JOIN cursos c ON p.curso_id = c.id
            INNER JOIN semestres s ON c.semestre_id = s.id
            INNER JOIN usuarios u_docente ON c.docente_id = u_docente.id
            LEFT JOIN usuarios u_evaluador ON p.evaluador_id = u_evaluador.id
            WHERE p.id = ?
        `;
        
        const portafolios = await executeQuery(query, [id]);
        
        if (portafolios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Portafolio no encontrado'
            });
        }
        
        const portafolio = portafolios[0];
        
        // Verificar permisos
        if (req.user.rol === 'docente' && portafolio.curso_id !== req.user.userId) {
            // Para docentes, verificar si es su curso
            const cursoCheck = await executeQuery(
                'SELECT id FROM cursos WHERE id = ? AND docente_id = ?',
                [portafolio.curso_id, req.user.userId]
            );
            
            if (cursoCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para ver este portafolio'
                });
            }
        }
        
        // Obtener documentos del portafolio
        const documentosQuery = `
            SELECT 
                d.*,
                cat.nombre as categoria_nombre,
                sub.nombre as subcategoria_nombre
            FROM documentos d
            INNER JOIN categorias_documento cat ON d.categoria_id = cat.id
            LEFT JOIN subcategorias_documento sub ON d.subcategoria_id = sub.id
            WHERE d.portafolio_id = ?
            ORDER BY cat.orden, sub.orden, d.fecha_subida
        `;
        
        const documentos = await executeQuery(documentosQuery, [id]);
        
        // Obtener comentarios si el usuario tiene permisos
        let comentarios = [];
        if (req.user.rol !== 'docente' || portafolio.evaluador_id === req.user.userId) {
            const comentariosQuery = `
                SELECT 
                    c.*,
                    u.nombres as evaluador_nombres,
                    u.apellidos as evaluador_apellidos,
                    d.nombre_original as documento_nombre
                FROM comentarios c
                INNER JOIN usuarios u ON c.evaluador_id = u.id
                LEFT JOIN documentos d ON c.documento_id = d.id
                WHERE c.portafolio_id = ?
                ORDER BY c.fecha_creacion DESC
            `;
            
            comentarios = await executeQuery(comentariosQuery, [id]);
        }
        
        res.json({
            success: true,
            data: {
                portafolio,
                documentos,
                comentarios
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo portafolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// CREAR PORTAFOLIO
router.post('/', auth, requireDocente, async (req, res) => {
    try {
        const { curso_id } = req.body;
        
        if (!curso_id) {
            return res.status(400).json({
                success: false,
                message: 'ID del curso es requerido'
            });
        }
        
        // Verificar que el curso existe y pertenece al docente
        const cursos = await executeQuery(
            'SELECT id, nombre FROM cursos WHERE id = ? AND docente_id = ?',
            [curso_id, req.user.userId]
        );
        
        if (cursos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado o no tienes permisos'
            });
        }
        
        // Verificar que no existe ya un portafolio para este curso
        const existingPortfolio = await executeQuery(
            'SELECT id FROM portafolios WHERE curso_id = ?',
            [curso_id]
        );
        
        if (existingPortfolio.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un portafolio para este curso'
            });
        }
        
        // Crear portafolio
        const result = await executeQuery(
            'INSERT INTO portafolios (curso_id) VALUES (?)',
            [curso_id]
        );
        
        // Obtener portafolio creado
        const nuevoPortafolio = await executeQuery(
            `SELECT 
                p.*,
                c.codigo as curso_codigo,
                c.nombre as curso_nombre
            FROM portafolios p
            INNER JOIN cursos c ON p.curso_id = c.id
            WHERE p.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Portafolio creado exitosamente',
            data: {
                portafolio: nuevoPortafolio[0]
            }
        });
        
    } catch (error) {
        console.error('Error creando portafolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ENVIAR PORTAFOLIO PARA REVISIÓN
router.put('/:id/enviar', auth, requireDocente, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el portafolio existe y pertenece al docente
        const portafolio = await executeQuery(
            `SELECT p.id, p.estado, c.docente_id
            FROM portafolios p
            INNER JOIN cursos c ON p.curso_id = c.id
            WHERE p.id = ? AND c.docente_id = ?`,
            [id, req.user.userId]
        );
        
        if (portafolio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Portafolio no encontrado o no tienes permisos'
            });
        }
        
        if (portafolio[0].estado !== 'borrador') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden enviar portafolios en estado borrador'
            });
        }
        
        // Verificar que tiene al menos un documento
        const documentos = await executeQuery(
            'SELECT COUNT(*) as total FROM documentos WHERE portafolio_id = ?',
            [id]
        );
        
        if (documentos[0].total === 0) {
            return res.status(400).json({
                success: false,
                message: 'El portafolio debe tener al menos un documento para ser enviado'
            });
        }
        
        // Actualizar estado
        await executeQuery(
            'UPDATE portafolios SET estado = "en_revision", fecha_envio = NOW() WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Portafolio enviado para revisión exitosamente'
        });
        
    } catch (error) {
        console.error('Error enviando portafolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ASIGNAR EVALUADOR (solo administradores)
router.put('/:id/asignar-evaluador', auth, requireAdmin, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { evaluador_id } = req.body;
        
        if (!evaluador_id) {
            return res.status(400).json({
                success: false,
                message: 'ID del evaluador es requerido'
            });
        }
        
        // Verificar que el evaluador existe
        const evaluador = await executeQuery(
            'SELECT id FROM usuarios WHERE id = ? AND rol = "evaluador" AND estado = "activo"',
            [evaluador_id]
        );
        
        if (evaluador.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Evaluador no encontrado o no activo'
            });
        }
        
        // Actualizar portafolio
        const result = await executeQuery(
            'UPDATE portafolios SET evaluador_id = ? WHERE id = ?',
            [evaluador_id, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Portafolio no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Evaluador asignado exitosamente'
        });
        
    } catch (error) {
        console.error('Error asignando evaluador:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// APROBAR/RECHAZAR PORTAFOLIO
router.put('/:id/evaluar', auth, requireEvaluador, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, comentarios_evaluacion } = req.body;
        
        if (!['aprobado', 'rechazado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado debe ser "aprobado" o "rechazado"'
            });
        }
        
        // Verificar que el portafolio existe y está asignado al evaluador
        const portafolio = await executeQuery(
            'SELECT id, estado, evaluador_id FROM portafolios WHERE id = ?',
            [id]
        );
        
        if (portafolio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Portafolio no encontrado'
            });
        }
        
        if (req.user.rol === 'evaluador' && portafolio[0].evaluador_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para evaluar este portafolio'
            });
        }
        
        if (portafolio[0].estado !== 'en_revision') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden evaluar portafolios en revisión'
            });
        }
        
        // Actualizar portafolio
        await executeQuery(
            `UPDATE portafolios 
            SET estado = ?, comentarios_evaluacion = ?, fecha_revision = NOW() 
            WHERE id = ?`,
            [estado, comentarios_evaluacion || null, id]
        );
        
        res.json({
            success: true,
            message: `Portafolio ${estado} exitosamente`
        });
        
    } catch (error) {
        console.error('Error evaluando portafolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// AGREGAR COMENTARIO
router.post('/:id/comentarios', auth, requireEvaluador, validateId, validateComentario,