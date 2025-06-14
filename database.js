const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

// Configuración de la conexión
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "portafolio_docente",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para verificar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexión a MySQL establecida correctamente");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Error conectando a MySQL:", error.message);
    return false;
  }
};

// Función para ejecutar queries
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error("Error ejecutando query:", error);
    throw error;
  }
};

// Función para transacciones
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params || []);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Función para cerrar todas las conexiones
const closeConnection = async () => {
  try {
    await pool.end();
    console.log("🔒 Pool de conexiones cerrado");
  } catch (error) {
    console.error("Error cerrando conexiones:", error);
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  closeConnection,
};
