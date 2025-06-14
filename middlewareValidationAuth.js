const Joi = require("joi");

// Esquemas de validación
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email debe ser válido",
      "any.required": "Email es requerido",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Contraseña debe tener al menos 6 caracteres",
      "any.required": "Contraseña es requerida",
    }),
  }),

  register: Joi.object({
    nombres: Joi.string().min(2).max(100).required().messages({
      "string.min": "Nombres debe tener al menos 2 caracteres",
      "string.max": "Nombres no puede exceder 100 caracteres",
      "any.required": "Nombres es requerido",
    }),
    apellidos: Joi.string().min(2).max(100).required().messages({
      "string.min": "Apellidos debe tener al menos 2 caracteres",
      "string.max": "Apellidos no puede exceder 100 caracteres",
      "any.required": "Apellidos es requerido",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Email debe ser válido",
      "any.required": "Email es requerido",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Contraseña debe tener al menos 6 caracteres",
      "any.required": "Contraseña es requerida",
    }),
    rol: Joi.string()
      .valid("administrador", "docente", "evaluador")
      .required()
      .messages({
        "any.only": "Rol debe ser: administrador, docente o evaluador",
        "any.required": "Rol es requerido",
      }),
    codigo_docente: Joi.string().min(3).max(20).optional().messages({
      "string.min": "Código de docente debe tener al menos 3 caracteres",
      "string.max": "Código de docente no puede exceder 20 caracteres",
    }),
  }),

  curso: Joi.object({
    codigo: Joi.string().min(3).max(20).required().messages({
      "string.min": "Código del curso debe tener al menos 3 caracteres",
      "string.max": "Código del curso no puede exceder 20 caracteres",
      "any.required": "Código del curso es requerido",
    }),
    nombre: Joi.string().min(5).max(200).required().messages({
      "string.min": "Nombre del curso debe tener al menos 5 caracteres",
      "string.max": "Nombre del curso no puede exceder 200 caracteres",
      "any.required": "Nombre del curso es requerido",
    }),
    descripcion: Joi.string().max(1000).optional(),
    creditos: Joi.number().integer().min(1).max(10).required().messages({
      "number.base": "Créditos debe ser un número",
      "number.integer": "Créditos debe ser un número entero",
      "number.min": "Créditos debe ser al menos 1",
      "number.max": "Créditos no puede exceder 10",
      "any.required": "Créditos es requerido",
    }),
    semestre_id: Joi.number().integer().positive().required().messages({
      "number.base": "ID del semestre debe ser un número",
      "number.positive": "ID del semestre debe ser positivo",
      "any.required": "ID del semestre es requerido",
    }),
    docente_id: Joi.number().integer().positive().required().messages({
      "number.base": "ID del docente debe ser un número",
      "number.positive": "ID del docente debe ser positivo",
      "any.required": "ID del docente es requerido",
    }),
  }),

  semestre: Joi.object({
    nombre: Joi.string().min(5).max(50).required().messages({
      "string.min": "Nombre del semestre debe tener al menos 5 caracteres",
      "string.max": "Nombre del semestre no puede exceder 50 caracteres",
      "any.required": "Nombre del semestre es requerido",
    }),
    fecha_inicio: Joi.date().required().messages({
      "date.base": "Fecha de inicio debe ser una fecha válida",
      "any.required": "Fecha de inicio es requerida",
    }),
    fecha_fin: Joi.date().min(Joi.ref("fecha_inicio")).required().messages({
      "date.base": "Fecha de fin debe ser una fecha válida",
      "date.min": "Fecha de fin debe ser posterior a la fecha de inicio",
      "any.required": "Fecha de fin es requerida",
    }),
    descripcion: Joi.string().max(500).optional(),
  }),

  comentario: Joi.object({
    comentario: Joi.string().min(10).max(2000).required().messages({
      "string.min": "Comentario debe tener al menos 10 caracteres",
      "string.max": "Comentario no puede exceder 2000 caracteres",
      "any.required": "Comentario es requerido",
    }),
    tipo: Joi.string()
      .valid("general", "documento", "sugerencia", "correccion")
      .default("general"),
    documento_id: Joi.number().integer().positive().optional(),
  }),
};

// Función para crear middleware de validación
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Mostrar todos los errores
      stripUnknown: true, // Remover campos no definidos en el schema
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Datos de entrada inválidos",
        errors,
      });
    }

    // Reemplazar req.body con los datos validados y limpiados
    req.body = value;
    next();
  };
};

// Middleware específicos
const validateLogin = createValidationMiddleware(schemas.login);
const validateRegister = createValidationMiddleware(schemas.register);
const validateCurso = createValidationMiddleware(schemas.curso);
const validateSemestre = createValidationMiddleware(schemas.semestre);
const validateComentario = createValidationMiddleware(schemas.comentario);

// Validación de parámetros de URL
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "ID debe ser un número positivo válido",
    });
  }

  req.params.id = id;
  next();
};

// Validación de query parameters para paginación
const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().max(50).optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  });

  const { error, value } = schema.validate(req.query);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Parámetros de consulta inválidos",
      error: error.details[0].message,
    });
  }

  req.query = value;
  next();
};

module.exports = {
  validateLogin,
  validateRegister,
  validateCurso,
  validateSemestre,
  validateComentario,
  validateId,
  validatePagination,
  schemas,
};
