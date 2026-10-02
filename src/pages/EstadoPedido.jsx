import React, { useState } from "react";
import "../App.css";
import { URL_BASE } from "../service/apiClient";

// RF-11: consulta pública del estado de un pedido ya registrado.
// El cliente ingresa el número que devolvió el backend y ve detalle + estado real.
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
  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) return String(fecha);
  return fechaParseada.toLocaleString("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
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
    // Solo dígitos: el número de pedido siempre es numérico
    setNumeroPedido(e.target.value.replace(/\D/g, ""));
    if (mensaje) setMensaje("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validamos antes de pegar a la API (mismo criterio que el formulario de pedido)
    const id = numeroPedido.trim();
    if (!id) {
      setPedido(null);
      setMensaje("Ingresa el número de tu pedido.");
      return;
    }

    setCargando(true);
    setMensaje("");
    setPedido(null);

    try {
      const response = await fetch(`${URL_BASE}/api/pedidos/${id}`);

      if (response.ok) {
        // 200: PedidoResponse con detalle, productos y estado
        setPedido(await response.json());
      } else if (response.status === 404) {
        // 404: el backend responde sin body cuando el id no existe
        setMensaje("No encontramos un pedido con ese número.");
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
            <label htmlFor="numeroPedido">Número de pedido:</label>
            <input
              type="number"
              id="numeroPedido"
              min="1"
              value={numeroPedido}
              onChange={handleChange}
              className={mensaje ? "input-error" : ""}
              placeholder="Ej: 7"
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
