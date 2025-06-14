const jwt = require("jsonwebtoken");
const { executeQuery } = require("../database/connection");

// Middleware de autenticación
const auth = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      });
    }

    // Verificar formato del token
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso inválido",
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario aún existe y está activo
    const users = await executeQuery(
      "SELECT id, nombres, apellidos, email, rol, estado FROM usuarios WHERE id = ?",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const user = users[0];
    if (user.estado !== "activo") {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo",
      });
    }

    // Agregar información del usuario a la request
    req.user = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      nombres: user.nombres,
      apellidos: user.apellidos,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    console.error("Error en middleware auth:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado",
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a este recurso",
      });
    }

    next();
  };
};

// Middleware para verificar si es administrador
const requireAdmin = requireRole("administrador");

// Middleware para verificar si es docente o administrador
const requireDocente = requireRole("docente", "administrador");

// Middleware para verificar si es evaluador o administrador
const requireEvaluador = requireRole("evaluador", "administrador");

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireDocente,
  requireEvaluador,
};
