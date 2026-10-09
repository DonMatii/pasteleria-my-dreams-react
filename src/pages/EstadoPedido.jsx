import React, { useState } from "react";
import "../App.css";
import { URL_BASE } from "../service/apiClient";

// RF-11: consulta pública del estado de un pedido ya registrado.
// El cliente ingresa el CÓDIGO OPACO de seguimiento (32 caracteres) que devolvió
// el backend al crear el pedido — nunca un id secuencial adivinable (protección IDOR).
// El formulario de contacto (RF-06) y el de pedido (RF-07) quedan intactos.

// Estados válidos en pedidos-service y su etiqueta amigable para la UI
const ETIQUETAS_ESTADO = {
  RECIBIDO: "Recibido",
  EN_PREPARACION: "En preparación",
  DESPACHADO: "Despachado",
  ENTREGADO: "Entregado",
};

// Clase visual (chip de color) para cada estado
const CLASES_ESTADO = {
  RECIBIDO: "estado-recibido",
  EN_PREPARACION: "estado-preparacion",
  DESPACHADO: "estado-despachado",
  ENTREGADO: "estado-entregado",
};

// Filas antiguas de dev traen estado vacío: se asume RECIBIDO (default del backend)
const normalizarEstado = (estado) => {
  const valor = String(estado ?? "").trim().toUpperCase();
  return valor || "RECIBIDO";
};

// Fecha ISO del backend → texto legible (mismo locale es-CL que usan los precios)
const formatearFecha = (fecha) => {
  if (!fecha) return "—";
  // El backend devuelve UTC sin sufijo Z (ej: 2026-10-09T20:46:19.47154).
  // JS lo trataria como hora local si no forzamos Z; luego convertimos a Chile.
  const esUtcSinSufijo =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(fecha);
  const texto = esUtcSinSufijo ? `${fecha}Z` : fecha;
  const fechaParseada = new Date(texto);
  if (Number.isNaN(fechaParseada.getTime())) return String(fecha);
  return fechaParseada.toLocaleString("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
};

const formatearMoneda = (valor) =>
  `$${Number(valor || 0).toLocaleString("es-CL")}`;

const EstadoPedido = () => {
  const [numeroPedido, setNumeroPedido] = useState("");
  const [pedido, setPedido] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    // El codigo de seguimiento es alfanumerico (UUID de 32 caracteres sin guiones)
    setNumeroPedido(e.target.value.replace(/\s/g, ""));
    if (mensaje) setMensaje("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validamos antes de pegar a la API (mismo criterio que el formulario de pedido)
    const codigo = numeroPedido.trim();
    if (!codigo) {
      setPedido(null);
      setMensaje("Ingresa tu código de seguimiento.");
      return;
    }

    setCargando(true);
    setMensaje("");
    setPedido(null);

    try {
      const response = await fetch(
        `${URL_BASE}/api/pedidos/seguimiento/${encodeURIComponent(codigo)}`
      );

      if (response.ok) {
        // 200: PedidoResponse con detalle, productos y estado
        setPedido(await response.json());
      } else if (response.status === 404) {
        // 404: el backend responde sin body cuando el codigo no existe
        setMensaje("No encontramos un pedido con ese código.");
      } else {
        setMensaje("No pudimos consultar el pedido. Intenta nuevamente.");
      }
    } catch {
      // Sin respuesta del servidor: red caída o servicio fuera
      setMensaje("Error de conexión.");
    } finally {
      setCargando(false);
    }
  };

  const estadoActual = normalizarEstado(pedido?.estado);
  const claseEstado = CLASES_ESTADO[estadoActual] || "estado-otro";

  return (
    <main className="main-content">
      <h1 className="titulo-principal">Consulta tu pedido</h1>
      <p className="subtitulo-home">
        Revisa en qué etapa está tu pedido al instante.
      </p>

      <div className="formulario-container">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="numeroPedido">Código de seguimiento:</label>
            <input
              type="text"
              id="numeroPedido"
              value={numeroPedido}
              onChange={handleChange}
              className={mensaje ? "input-error" : ""}
              placeholder="Ej: 3f9c2a1b..."
            />
            {mensaje && (
              <span className="error-text" role="alert">
                {mensaje}
              </span>
            )}
          </div>

          <button type="submit" className="boton-principal" disabled={cargando}>
            {cargando ? "Consultando..." : "Consultar"}
          </button>
        </form>
      </div>

      {pedido && (
        <section
          className="formulario-container estado-resultado"
          aria-live="polite"
        >
          <h2 className="estado-titulo">Pedido N° {pedido.id}</h2>

          <span
            className={`estado-badge ${claseEstado}`}
            data-testid="estado-badge"
          >
            {ETIQUETAS_ESTADO[estadoActual] || estadoActual}
          </span>

          <ul className="estado-datos">
            <li>
              <strong>Cliente:</strong> {pedido.cliente || "—"}
            </li>
            <li>
              <strong>Fecha:</strong> {formatearFecha(pedido.fecha)}
            </li>
          </ul>

          <h3 className="estado-subtitulo">Productos</h3>
          <ul className="estado-productos">
            {(pedido.productos || []).map((producto, indice) => (
              <li key={`${pedido.id}-${indice}`}>
                <span>
                  {producto.nombre} × {producto.cantidad}
                </span>
                <span>{formatearMoneda(producto.subtotal)}</span>
              </li>
            ))}
          </ul>

          {Number(pedido.descuento) > 0 && (
            <>
              <div className="estado-total" data-testid="subtotal-estado">
                <span>Subtotal:</span>
                <span className="precio-tag">
                  {formatearMoneda(pedido.subtotal)}
                </span>
              </div>
              <div className="estado-total" data-testid="descuento-estado">
                <span>
                  {`Descuento de bienvenida${pedido.codigoDescuento ? ` (${pedido.codigoDescuento})` : ""}:`}
                </span>
                <span className="precio-tag">
                  -{formatearMoneda(pedido.descuento)}
                </span>
              </div>
            </>
          )}

          <div className="estado-total">
            <span>Total:</span>
            <span className="precio-tag" data-testid="total-estado">
              {formatearMoneda(pedido.total)}
            </span>
          </div>
        </section>
      )}
    </main>
  );
};

export default EstadoPedido;
