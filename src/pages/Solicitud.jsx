import { useState } from "react";
import apiClient from "../service/apiClient";
import SelectorProductos from "../components/SelectorProductos";
import "../App.css";

// Solicitud de pedido de la Versión 1 (S2): el usuario V1 elige sus delicias y
// envía el formulario; NO es una venta (no hay carrito, total ni código de
// seguimiento). El backend guarda la solicitud (POST /api/solicitudes), publica
// el evento SolicitudCreado y notificaciones-service avisa por correo.
const Solicitud = () => {
  // El correo del login de Google se usa como contacto de la solicitud
  const [formData, setFormData] = useState({
    nombre: "",
    email: sessionStorage.getItem("userEmail") || "",
    telefono: "",
    mensaje: "",
  });
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const [enviada, setEnviada] = useState(false);

  // Selección de productos con cantidades: misma interacción que la ventanita
  // del checkout de la V2 (SelectorProductos), pero aquí la selección vive en
  // la página porque la V1 no tiene carrito compartido
  const [seleccion, setSeleccion] = useState([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const agregarProducto = (producto, cantidad) => {
    setSeleccion((prev) => {
      const existe = prev.find((it) => it.id === producto.id);
      if (existe) {
        return prev.map((it) =>
          it.id === producto.id
            ? { ...it, cantidad: it.cantidad + cantidad }
            : it
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          imagenUrl: producto.imagenUrl,
          cantidad,
        },
      ];
    });
  };

  const cambiarCantidad = (id, cantidad) => {
    // En 1 el − no llega a 0: la fila no desaparece ni el detalle se rompe
    if (cantidad < 1) return;
    setSeleccion((prev) =>
      prev.map((it) => (it.id === id ? { ...it, cantidad } : it))
    );
  };

  const quitarProducto = (id) => {
    setSeleccion((prev) => prev.filter((it) => it.id !== id));
  };

  // Productos y cantidades en texto legible, como los quiere la solicitud
  const detalleTexto = () =>
    seleccion.map((it) => `${it.nombre} x${it.cantidad}`).join(", ");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errores[id]) setErrores((prev) => ({ ...prev, [id]: "" }));
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    const patronNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = "Por favor, ingresa tu nombre.";
    } else if (!patronNombre.test(formData.nombre)) {
      nuevosErrores.nombre = "El nombre no debe contener números ni símbolos.";
    }

    if (!formData.email.trim() || !patronEmail.test(formData.email)) {
      nuevosErrores.email = "Ingresa un correo electrónico válido.";
    }

    if (!formData.telefono.trim()) {
      nuevosErrores.telefono = "Por favor, ingresa tu teléfono.";
    }

    if (!seleccion.length) {
      nuevosErrores.producto = "Agrega al menos un producto a tu solicitud.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    // Cuerpo de POST /api/solicitudes: contacto y detalle en texto legible.
    // El mensaje solo viaja si el cliente lo escribió (es opcional).
    const cuerpo = {
      nombre: formData.nombre.trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      detalle: detalleTexto(),
    };
    if (formData.mensaje.trim()) {
      cuerpo.mensaje = formData.mensaje.trim();
    }

    try {
      await apiClient.post("/api/solicitudes", cuerpo);
      setEnviada(true);
    } catch (error) {
      setErrores({
        envio:
          error?.response?.data?.mensaje ||
          "No se pudo enviar tu solicitud. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (enviada) {
    return (
      <main className="main-content fondo-pagina">
        <div
          className="formulario-container"
          data-testid="solicitud-confirmacion"
          style={{ textAlign: "center" }}
        >
          <h1 className="titulo-principal">¡Gracias por tu solicitud!</h1>
          <p className="subtitulo-home">
            Recibimos tu solicitud — te contactaremos pronto
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content fondo-pagina">
      <h1 className="titulo-principal">Solicitud de pedido</h1>
      <p className="subtitulo-home">
        Elige tus delicias y envíanos tu solicitud: te contactaremos para
        coordinar tu pedido.
      </p>

      <div className="formulario-container">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="nombre">Nombre del Cliente:</label>
            <input
              type="text"
              id="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={errores.nombre ? "input-error" : ""}
              placeholder="Ej: María Pérez"
            />
            {errores.nombre && (
              <span className="error-text">{errores.nombre}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className={errores.email ? "input-error" : ""}
              placeholder="maria@correo.com"
            />
            {errores.email && (
              <span className="error-text">{errores.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono:</label>
            <input
              type="tel"
              id="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className={errores.telefono ? "input-error" : ""}
              placeholder="Ej: +56 9 1234 5678"
            />
            {errores.telefono && (
              <span className="error-text">{errores.telefono}</span>
            )}
          </div>

          {seleccion.length === 0 ? (
            <div
              className="form-group pedido-vacio"
              data-testid="solicitud-vacia"
            >
              <p>
                Aún no has elegido productos. ¡Selecciona tus delicias con sus
                cantidades!
              </p>
            </div>
          ) : (
            <div className="form-group" data-testid="productos-solicitud">
              <label>Tu solicitud:</label>
              <ul className="pedido-carrito">
                {seleccion.map((it) => (
                  <li key={it.id} className="pedido-carrito-item">
                    <div className="pedido-carrito-info">
                      <span className="pedido-carrito-nombre">{it.nombre}</span>
                    </div>
                    {/* Mismo stepper que el mini carrito y el checkout */}
                    <div
                      className="mini-carrito-controles"
                      role="group"
                      aria-label={`Cantidad de ${it.nombre}`}
                    >
                      <button
                        type="button"
                        aria-label={`Restar ${it.nombre}`}
                        onClick={() => cambiarCantidad(it.id, it.cantidad - 1)}
                      >
                        −
                      </button>
                      <span className="mini-carrito-cantidad" aria-live="polite">
                        {it.cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Sumar ${it.nombre}`}
                        onClick={() => cambiarCantidad(it.id, it.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="pedido-carrito-quitar"
                      aria-label={`Quitar ${it.nombre}`}
                      onClick={() => quitarProducto(it.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <button
              type="button"
              className="pedido-seguir"
              data-testid="abrir-selector"
              onClick={() => setSelectorAbierto(true)}
            >
              Elegir productos
            </button>
            {errores.producto && (
              <span className="error-text">{errores.producto}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="mensaje">Mensaje (opcional):</label>
            <textarea
              id="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows="4"
              placeholder="Cuéntanos algo especial (fecha, dedicatoria, restricciones...)"
            />
          </div>

          {errores.envio && (
            <span className="error-text" data-testid="error-envio">
              {errores.envio}
            </span>
          )}

          <button
            type="submit"
            className="boton-principal"
            style={{ width: "100%", marginTop: "10px" }}
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>

      <SelectorProductos
        abierto={selectorAbierto}
        onCerrar={() => setSelectorAbierto(false)}
        onAgregar={agregarProducto}
      />
    </main>
  );
};

export default Solicitud;
