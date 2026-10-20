import apiClient from "./apiClient";

// Beneficio de primera conexión (feedback del profe): -10% en el primer pedido
// de quien inicia sesión por primera vez. Todo vive en localStorage del navegador:
// el backend solo valida y persiste el código cuando la página de pedido lo envía.

const CLAVE_PRIMERA_CONEXION = "md_primera_conexion";
const CLAVE_CODIGO = "md_codigo_bienvenida";

export const CODIGO_BIENVENIDO = "BIENVENIDO10";

// Se llama al iniciar sesión: solo la PRIMERA vez en este navegador entrega el código
export const registrarPrimeraConexion = () => {
  if (!localStorage.getItem(CLAVE_PRIMERA_CONEXION)) {
    localStorage.setItem(CLAVE_PRIMERA_CONEXION, "1");
    localStorage.setItem(CLAVE_CODIGO, CODIGO_BIENVENIDO);
    return true;
  }
  return false;
};

// Código pendiente de canjear (null si ya se usó o nunca existió)
export const obtenerCodigoBienvenida = () => localStorage.getItem(CLAVE_CODIGO);

// Se consume tras registrar el pedido con descuento: no se repite
export const consumirCodigoBienvenida = () => localStorage.removeItem(CLAVE_CODIGO);

// Único código aceptado (la página de pedido no envía cualquier texto)
export const esCodigoValido = (codigo) =>
  (codigo || "").trim().toUpperCase() === CODIGO_BIENVENIDO;

// true mientras este navegador nunca haya iniciado sesión (teaser de /pedido:
// solo a ese invitado se le promete el -10% de primera conexión)
export const esPrimeraConexion = () => !localStorage.getItem(CLAVE_PRIMERA_CONEXION);

// El backend es la autoridad del uso único por email (feedback de demo: no
// prometer un código trampa). Pregunta si ese email todavía puede canjear
// BIENVENIDO10. Si el backend no responde, devuelve false: sin confirmación
// no se promete el descuento (coherente con "nunca prometer lo no confirmado").
export const verificarElegibilidadBienvenida = async (email) => {
  if (!email) return false;
  try {
    const respuesta = await apiClient.get("/api/pedidos/bienvenida/estado", {
      params: { email },
    });
    return respuesta.data?.elegible === true;
  } catch (error) {
    console.error("Error al consultar elegibilidad de bienvenida:", error);
    return false;
  }
};
