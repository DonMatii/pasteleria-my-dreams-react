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

// Orden real del flujo de estados: alimenta la línea de avance del resultado
const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "DESPACHADO", "ENTREGADO"];

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
  // El backend devuelve el instante en UTC con sufijo Z (ej: 2026-10-20T23:14:48.1991Z);
  // esa marca es la que permite convertirlo a Chile sin adivinar la zona horaria.
  // Si alguna respuesta viniera sin ella, JS la trataria como hora local:
  // entonces forzamos Z para que se lea como UTC antes de convertir.
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
  // Posición en el flujo: alimenta la línea de avance (si el estado viene
  // de una versión vieja y no está en la lista, no se dibuja la línea)
  const indiceActual = ORDEN_ESTADOS.indexOf(estadoActual);

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
          <div className="estado-cabecera">
            <h2 className="estado-titulo">Tu pedido</h2>
            <span
              className={`estado-badge ${claseEstado}`}
              data-testid="estado-badge"
            >
              {ETIQUETAS_ESTADO[estadoActual] || estadoActual}
            </span>
          </div>

          {indiceActual >= 0 && (
            <ol className="estado-progreso" data-testid="estado-progreso">
              {ORDEN_ESTADOS.map((clave, indice) => (
                <li
                  key={clave}
                  className={[
                    "estado-paso",
                    indice < indiceActual ? "estado-paso-hecho" : "",
                    clave === estadoActual ? "estado-paso-actual" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="estado-paso-punto">
                    {indice < indiceActual ? "✓" : indice + 1}
                  </span>
                  <span className="estado-paso-nombre">
                    {ETIQUETAS_ESTADO[clave]}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <ul className="estado-datos">
            <li className="estado-dato">
              <span className="estado-dato-label">Cliente</span>
              <span className="estado-dato-valor">{pedido.cliente || "—"}</span>
            </li>
            <li className="estado-dato">
              <span className="estado-dato-label">Fecha</span>
              <span className="estado-dato-valor">
                {formatearFecha(pedido.fecha)}
              </span>
            </li>
          </ul>

          <h3 className="estado-subtitulo">Productos</h3>
          <ul className="estado-productos">
            {(pedido.productos || []).map((producto, indice) => (
              <li key={`${pedido.id}-${indice}`} className="estado-producto">
                <span className="estado-producto-nombre">
                  {producto.nombre}
                  <span className="estado-producto-cant">
                    × {producto.cantidad}
                  </span>
                </span>
                <span className="estado-producto-subtotal">
                  {formatearMoneda(producto.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="estado-resumen">
            {Number(pedido.descuento) > 0 && (
              <>
                <div className="estado-total" data-testid="subtotal-estado">
                  <span>Subtotal</span>
                  <span className="estado-monto">
                    {formatearMoneda(pedido.subtotal)}
                  </span>
                </div>
                {Number(pedido.descuentoBienvenida) > 0 && (
                  <div
                    className="estado-total estado-descuento"
                    data-testid="descuento-estado"
                  >
                    <span>
                      {`Descuento de bienvenida${pedido.codigoDescuento ? ` (${pedido.codigoDescuento})` : ""}`}
                    </span>
                    <span>-{formatearMoneda(pedido.descuentoBienvenida)}</span>
                  </div>
                )}
                {Number(pedido.descuentoDelicia) > 0 && (
                  <div
                    className="estado-total estado-descuento"
                    data-testid="descuento-delicia-estado"
                  >
                    <span>Descuento Delicia del Día (-10%)</span>
                    <span>-{formatearMoneda(pedido.descuentoDelicia)}</span>
                  </div>
                )}
                {/* Respaldo: respuestas sin desglose (por ejemplo, backend viejo) */}
                {Number(pedido.descuentoBienvenida) === 0 &&
                  Number(pedido.descuentoDelicia) === 0 && (
                    <div
                      className="estado-total estado-descuento"
                      data-testid="descuento-estado"
                    >
                      <span>Descuento</span>
                      <span>-{formatearMoneda(pedido.descuento)}</span>
                    </div>
                  )}
              </>
            )}
            <div className="estado-total estado-total-final">
              <span>Total</span>
              <span className="estado-total-monto" data-testid="total-estado">
                {formatearMoneda(pedido.total)}
              </span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default EstadoPedido;
