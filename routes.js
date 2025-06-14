const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database/connection');
const { validateLogin, validateRegister } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const router = express.Router();

// LOGIN
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email
        const users = await executeQuery(
            'SELECT id, nombres, apellidos, email, password_hash, rol, estado FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        // Verificar si el usuario está activo
        if (user.estado !== 'activo') {
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo o suspendido'
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Actualizar último acceso
        await executeQuery(
            'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?',
            [user.id]
        );

        // Generar token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                rol: user.rol 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Respuesta sin contraseña
        const { password_hash, ...userResponse } = user;

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: userResponse,
                token
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// LOGOUT (opcional - para invalidar token del lado del cliente)
router.post('/logout', auth, async (req, res) => {
    try {
        // En un sistema más avanzado, aquí podrías agregar el token a una blacklist
        // Por ahora solo respondemos exitosamente
        res.json({
            success: true,
            message: 'Logout exitoso'
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
    }
});

// REGISTRO (solo administradores pueden registrar usuarios)
router.post('/register', auth, validateRegister, async (req, res) => {
    try {
        // Solo administradores pueden registrar usuarios
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden registrar usuarios'
            });
        }

        const { nombres, apellidos, email, password, rol, codigo_docente } = req.body;

        // Verificar si el email ya existe
        const existingUsers = await executeQuery(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Verificar código de docente si es necesario
        if (rol === 'docente' && codigo_docente) {
            const existingCode = await executeQuery(
                'SELECT id FROM usuarios WHERE codigo_docente = ?',
                [codigo_docente]
            );

            if (existingCode.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El código de docente ya está registrado'
                });
            }
        }

        // Encriptar contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insertar usuario
        const result = await executeQuery(
            `INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, codigo_docente) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombres, apellidos, email, passwordHash, rol, codigo_docente || null]
        );

        // Obtener usuario creado
        const newUser = await executeQuery(
            'SELECT id, nombres, apellidos, email, rol, codigo_docente, estado, fecha_creacion FROM usuarios WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: newUser[0]
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// VERIFICAR TOKEN
router.get('/verify', auth, async (req, res) => {
    try {
        // Obtener información actualizada del usuario
        const users = await executeQuery(
            'SELECT id, nombres, apellidos, email, rol, codigo_docente, estado, ultimo_acceso FROM usuarios WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = users[0];

        if (user.estado !== 'activo') {
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo'
            });
        }

        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// CAMBIAR CONTRASEÑA
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual y nueva contraseña son requeridas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Obtener usuario actual
        const users = await executeQuery(
            'SELECT password_hash FROM usuarios WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        // Encriptar nueva contraseña
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar contraseña
        await executeQuery(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [newPasswordHash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });