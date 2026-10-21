import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCarrito } from "../context/CarritoContext";
import {
  obtenerProductos,
  obtenerDeliciaDelDia,
  aplanarCatalogo,
} from "../service/ProductosService";
import { URL_BASE } from "../service/apiClient";
import {
  esCodigoValido,
  obtenerCodigoBienvenida,
  consumirCodigoBienvenida,
} from "../service/BienvenidaService";
import Swal from "sweetalert2";
import { toastAgregado } from "../utils/toastAgregado";
import "../App.css";

// RF-07: checkout para registrar un pedido real en el backend.
// La selección de productos vive en el carrito compartido (se llena desde
// /delicias y el mini carrito); esta página es la revisión y confirmación.
// El formulario de contacto (Contacto.jsx / Formspree, RF-06) queda intacto.
const Pedido = () => {
  const [formData, setFormData] = useState({
    cliente: "",
    email: "",
  });

  // Carrito compartido con Delicias (contexto)
  const {
    items,
    agregarAlCarrito,
    quitarItem,
    cambiarCantidad: cambiarCantidadItem,
    limpiarCarrito,
    total,
  } = useCarrito();

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  // Codigo de bienvenida: el campo arranca VACIO y el cliente lo escribe a mano
  // (feedback de demo: nada de codigo prellenado. Si ya lo canjeo, no ve un error
  // provocado por un codigo que el no puso; si es suyo, lo tipea y listo)
  const [codigoDescuento, setCodigoDescuento] = useState("");

  // Delicia del día: el backend aplica -10% sobre TODO el pedido si el carrito
  // la incluye (match por nombre). Aquí solo estimamos el ahorro en vivo.
  const [deliciaDelDia, setDeliciaDelDia] = useState(null);

  useEffect(() => {
    const cargarDelicia = async () => {
      try {
        const delicia = await obtenerDeliciaDelDia();
        if (delicia && delicia.nombre) setDeliciaDelDia(delicia);
      } catch (error) {
        // Sin delicia informada no se muestra ningún descuento extra
        console.error("Error al cargar la delicia del día en Pedido:", error);
      }
    };

    cargarDelicia();
  }, []);

  // Ventanita del catálogo: seguir agregando delicias sin salir del checkout
  const [modalAbierto, setModalAbierto] = useState(false);
  const [catalogoModal, setCatalogoModal] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [cantidadesModal, setCantidadesModal] = useState({});
  // El panel del modal es su propio contenedor de scroll: el boton flotante de
  // la pagina hace window.scrollTo y a este panel no le mueve nada, asi que hace
  // falta una referencia al panel y su propio umbral de visibilidad.
  const panelCatalogoRef = useRef(null);
  const [panelDesplazado, setPanelDesplazado] = useState(false);

  useEffect(() => {
    if (!modalAbierto) return undefined;
    let activo = true;
    const cargarCatalogo = async () => {
      setCargandoModal(true);
      setErrorModal("");
      try {
        const datos = await obtenerProductos();
        if (activo) setCatalogoModal(aplanarCatalogo(datos));
      } catch (error) {
        if (activo) {
          console.error("Error al cargar el catálogo en la ventanita:", error);
          setErrorModal("No se pudo cargar el catálogo. Intenta nuevamente.");
        }
      } finally {
        if (activo) setCargandoModal(false);
      }
    };
    cargarCatalogo();
    return () => {
      activo = false;
    };
  }, [modalAbierto]);

  // Se escucha el scroll del PANEL, no el de la pagina: ese es el que se mueve
  // cuando hay muchos productos y el cliente pierde el titulo de arriba.
  useEffect(() => {
    if (!modalAbierto) return undefined;
    const panel = panelCatalogoRef.current;
    if (!panel) return undefined;
    const alDesplazar = () => setPanelDesplazado(panel.scrollTop > 300);
    alDesplazar();
    panel.addEventListener("scroll", alDesplazar, { passive: true });
    return () => panel.removeEventListener("scroll", alDesplazar);
  }, [modalAbierto]);

  // Descuento de bienvenida en vivo: -10% mientras el codigo sea valido Y siga disponible
  // (disponible = no canjeado: el codigo se gana una sola vez por navegador)
  const codigoValido = esCodigoValido(codigoDescuento);
  const codigoDisponible = Boolean(obtenerCodigoBienvenida());
  const descuento = codigoValido && codigoDisponible ? Math.floor(total / 10) : 0;

  // Descuento de la delicia del día: match por nombre (trim + ignore case),
  // la misma regla que aplica el backend sobre TODO el pedido
  const carritoIncluyeDelicia =
    Boolean(deliciaDelDia) &&
    items.some(
      (it) =>
        it.nombre &&
        it.nombre.trim().toLowerCase() ===
          deliciaDelDia.nombre.trim().toLowerCase()
    );
  const descuentoDelicia = carritoIncluyeDelicia ? Math.floor(total / 10) : 0;
  const totalFinal = total - descuento - descuentoDelicia;

  // ¿Este producto de la ventanita es la delicia del día? Coincide por id (ambos
  // vienen del catálogo) y también por nombre, que es como ya decide el carrito
  // si aplica el descuento: si el backend cambia de fuente, aun asi se marca.
  const esDeliciaDelDia = (prod) => {
    if (!deliciaDelDia || !prod) return false;
    const mismoId = deliciaDelDia.id != null && prod.id === deliciaDelDia.id;
    const mismoNombre =
      prod.nombre &&
      deliciaDelDia.nombre &&
      prod.nombre.trim().toLowerCase() ===
        deliciaDelDia.nombre.trim().toLowerCase();
    return mismoId || mismoNombre;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "codigoDescuento") {
      setCodigoDescuento(value);
      if (errores.codigoDescuento) {
        setErrores({ ...errores, codigoDescuento: "" });
      }
      return;
    }
    setFormData({ ...formData, [id]: value });
    if (errores[id]) setErrores({ ...errores, [id]: "" });
  };

  const validarFormulario = () => {
    let nuevosErrores = {};
    let esValido = true;
    const patronNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.cliente.trim()) {
      nuevosErrores.cliente = "Por favor, ingresa tu nombre.";
      esValido = false;
    } else if (!patronNombre.test(formData.cliente)) {
      nuevosErrores.cliente = "El nombre no debe contener números ni símbolos.";
      esValido = false;
    }

    if (!formData.email.trim() || !patronEmail.test(formData.email)) {
      nuevosErrores.email = "Ingresa un correo electrónico válido.";
      esValido = false;
    }

    if (!items.length) {
      nuevosErrores.producto =
        "Agrega al menos un producto a tu pedido.";
      esValido = false;
    }

    if (codigoDescuento.trim() && !esCodigoValido(codigoDescuento)) {
      nuevosErrores.codigoDescuento = "Código de descuento inválido.";
      esValido = false;
    }

    setErrores(nuevosErrores);
    return esValido;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) {
      Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Por favor, revisa los campos marcados para continuar.",
        confirmButtonColor: "#d95386",
      });
      return;
    }

    setLoading(true);

    // Cuerpo exacto de PedidoRequest (POST /api/pedidos): cliente + email + lista de productos.
    // El carrito arma la lista completa que el backend espera.
    const cuerpoPedido = {
      cliente: formData.cliente.trim(),
      email: formData.email.trim(),
      productos: items.map((it) => ({
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precio),
      })),
    };
    // Un codigo valido viaja al backend: el uso unico por email lo decide la base de datos
    if (codigoValido) {
      cuerpoPedido.codigoDescuento = codigoDescuento.trim().toUpperCase();
    }

    try {
      const response = await fetch(`${URL_BASE}/api/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoPedido),
      });

      if (response.ok) {
        // 201: el backend responde con PedidoResponse (id, total, codigo de seguimiento, ...)
        const pedidoCreado = await response.json();
        const totalCreado = Number(pedidoCreado?.total ?? total);
        const codigoSeguimiento = pedidoCreado?.codigoConsulta || "";
        // El codigo de bienvenida se canjea una sola vez en este navegador
        if (descuento > 0) {
          consumirCodigoBienvenida();
        }
        // El desglose real lo decide el backend: bienvenida solo si canjeó el
        // código, delicia si el pedido incluyó la delicia del día
        const descBienvenida = Number(pedidoCreado?.descuentoBienvenida ?? 0);
        const descDelicia = Number(pedidoCreado?.descuentoDelicia ?? 0);
        const descTotal = Number(pedidoCreado?.descuento ?? 0);
        let textoDescuento = "";
        if (descBienvenida > 0) {
          textoDescuento += ` Se aplicó tu descuento de bienvenida (BIENVENIDO10): -$${descBienvenida.toLocaleString("es-CL")}.`;
        }
        if (descDelicia > 0) {
          textoDescuento += ` Descuento Delicia del Día (-10%): -$${descDelicia.toLocaleString("es-CL")}.`;
        }
        if (textoDescuento === "" && descTotal > 0) {
          textoDescuento = ` Se aplicaron descuentos: -$${descTotal.toLocaleString("es-CL")}.`;
        }
        // El número de pedido es interno: al cliente lo que le sirve es el código
        Swal.fire({
          icon: "success",
          title: "¡Pedido registrado!",
          text: `Pedido por $${totalCreado.toLocaleString(
            "es-CL"
          )}. Tu código de seguimiento: ${codigoSeguimiento} (guárdalo para consultar el estado).${textoDescuento} Te enviaremos la confirmación a tu correo. 🧁`,
          confirmButtonColor: "#d95386",
        });
        setFormData({ cliente: "", email: "" });
        limpiarCarrito();
        setCodigoDescuento("");
        setErrores({});
      } else if (response.status === 400) {
        // 400: el backend devuelve { "mensaje": "..." } con la regla que falló
        const errorBackend = await response.json().catch(() => null);
        Swal.fire(
          "Error",
          errorBackend?.mensaje || "No se pudo registrar el pedido.",
          "error"
        );
      } else {
        Swal.fire("Error", "No se pudo registrar el pedido.", "error");
      }
    } catch {
      // Sin respuesta del servidor: red caída o servicio fuera
      Swal.fire("Error", "Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content">
      <h1 className="titulo-principal">¡Haz tu pedido!</h1>
      <p className="subtitulo-home">
        Elige tus delicias en el catálogo, revisa tu pedido y lo registramos al instante.
      </p>

      <div className="formulario-container">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="cliente">Nombre del Cliente:</label>
            <input
              type="text"
              id="cliente"
              value={formData.cliente}
              onChange={handleChange}
              className={errores.cliente ? "input-error" : ""}
              placeholder="Ej: María Pérez"
            />
            {errores.cliente && <span className="error-text">{errores.cliente}</span>}
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
            {errores.email && <span className="error-text">{errores.email}</span>}
          </div>

          {items.length === 0 ? (
            <div className="form-group pedido-vacio" data-testid="pedido-vacio">
              <p>Tu pedido está vacío. ¡Agrega delicias desde nuestro catálogo!</p>
              <Link to="/delicias" className="boton-secundario">
                Ver nuestras delicias
              </Link>
            </div>
          ) : (
            <div className="form-group" data-testid="carrito-pedido">
              <label>Tu pedido:</label>
              <ul className="pedido-carrito">
                {items.map((it) => (
                  <li key={it.id} className="pedido-carrito-item">
                    <img
                      className="pedido-carrito-img"
                      src={`/img/${it.imagenUrl || "alfajor.jpg"}`}
                      alt={it.nombre}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = "/img/alfajor.jpg";
                      }}
                    />
                    <div className="pedido-carrito-info">
                      <span className="pedido-carrito-nombre">{it.nombre}</span>
                      <span className="pedido-carrito-cu">
                        c/u ${Number(it.precio).toLocaleString("es-CL")}
                      </span>
                    </div>
                    {/* Mismo stepper que el mini carrito: dos botones grandes
                        en vez del input numérico nativo, cuyas flechitas de
                        10px no puede apuntar alguien con mala visión. */}
                    <div
                      className="mini-carrito-controles"
                      role="group"
                      aria-label={`Cantidad de ${it.nombre}`}
                    >
                      <button
                        type="button"
                        aria-label={`Restar ${it.nombre}`}
                        onClick={() =>
                          cambiarCantidadItem(it.id, it.cantidad - 1)
                        }
                      >
                        −
                      </button>
                      <span className="mini-carrito-cantidad" aria-live="polite">
                        {it.cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Sumar ${it.nombre}`}
                        onClick={() =>
                          cambiarCantidadItem(it.id, it.cantidad + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <span className="pedido-carrito-subtotal">
                      ${(Number(it.precio) * Number(it.cantidad)).toLocaleString(
                        "es-CL"
                      )}
                    </span>
                    <button
                      type="button"
                      className="pedido-carrito-quitar"
                      aria-label={`Quitar ${it.nombre}`}
                      onClick={() => quitarItem(it.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="pedido-seguir"
                data-testid="seguir-agregando"
                onClick={() => setModalAbierto(true)}
              >
                + Seguir agregando delicias
              </button>
              {errores.producto && (
                <span className="error-text">{errores.producto}</span>
              )}
            </div>
          )}
          {!items.length && errores.producto && (
            <span className="error-text">{errores.producto}</span>
          )}

          <div className="form-group">
            <label htmlFor="codigoDescuento">Código de descuento (opcional):</label>
            <input
              type="text"
              id="codigoDescuento"
              value={codigoDescuento}
              onChange={handleChange}
              placeholder="Ej: BIENVENIDO10"
              className={errores.codigoDescuento ? "input-error" : ""}
            />
            {errores.codigoDescuento && (
              <span className="error-text">{errores.codigoDescuento}</span>
            )}
          </div>

          {items.length > 0 && (
            <div className="pedido-resumen">
              <div className="pedido-resumen-fila">
                <span>Subtotal</span>
                <span className="pedido-resumen-monto" data-testid="total-pedido">
                  ${total.toLocaleString("es-CL")}
                </span>
              </div>
              {codigoValido && codigoDisponible && (
                <div className="pedido-resumen-fila pedido-resumen-descuento">
                  <span>Descuento de bienvenida (-10%)</span>
                  <span data-testid="descuento-bienvenida">
                    -${descuento.toLocaleString("es-CL")}
                  </span>
                </div>
              )}
              {descuentoDelicia > 0 && (
                <div className="pedido-resumen-fila pedido-resumen-descuento">
                  <span>Descuento Delicia del Día (-10%)</span>
                  <span data-testid="descuento-delicia">
                    -${descuentoDelicia.toLocaleString("es-CL")}
                  </span>
                </div>
              )}
              <div className="pedido-resumen-total" data-testid="total-final">
                <span>Total</span>
                <span className="pedido-resumen-total-monto">
                  ${totalFinal.toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="boton-principal"
            style={{ width: "100%", marginTop: "10px" }}
            disabled={loading}
          >
            {loading ? "Registrando..." : "Registrar pedido"}
          </button>
        </form>
      </div>

      {modalAbierto && (
        <div
          className="modal-overlay"
          data-testid="modal-catalogo"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Agregar más delicias"
            onClick={(e) => e.stopPropagation()}
            ref={panelCatalogoRef}
          >
            <div className="modal-cabecera">
              <h3>Agrega más delicias</h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setModalAbierto(false)}
              >
                ✕
              </button>
            </div>
            {cargandoModal && <p className="modal-estado">Cargando catálogo...</p>}
            {errorModal && <p className="error-text">{errorModal}</p>}
            <div className="modal-grid">
              {catalogoModal.map((prod) => (
                <div className="modal-tarjeta" key={prod.id}>
                  {/* Badge de la delicia del día: mismo aviso que en /delicias */}
                  {esDeliciaDelDia(prod) && (
                    <span
                      className="delicia-badge"
                      data-testid="badge-delicia-modal"
                    >
                      -10% hoy
                    </span>
                  )}
                  <img
                    src={`/img/${prod.imagenUrl || "alfajor.jpg"}`}
                    alt={prod.nombre}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "/img/alfajor.jpg";
                    }}
                  />
                  <span className="modal-tarjeta-nombre">{prod.nombre}</span>
                  <span className="modal-tarjeta-precio">
                    ${Number(prod.precio).toLocaleString("es-CL")}
                  </span>
                  <div className="modal-tarjeta-fila">
                    {/* Mismo stepper que el mini carrito, en vez del input
                        numérico nativo con sus flechitas diminutas. */}
                    <div
                      className="mini-carrito-controles"
                      role="group"
                      aria-label={`Cantidad modal de ${prod.nombre}`}
                    >
                      <button
                        type="button"
                        aria-label={`Restar ${prod.nombre}`}
                        onClick={() =>
                          setCantidadesModal((prev) => {
                            const actual = Number(prev[prod.id] ?? 1);
                            return actual > 1
                              ? { ...prev, [prod.id]: actual - 1 }
                              : prev;
                          })
                        }
                      >
                        −
                      </button>
                      <span className="mini-carrito-cantidad" aria-live="polite">
                        {cantidadesModal[prod.id] ?? 1}
                      </span>
                      <button
                        type="button"
                        aria-label={`Sumar ${prod.nombre}`}
                        onClick={() =>
                          setCantidadesModal((prev) => ({
                            ...prev,
                            [prod.id]: Number(prev[prod.id] ?? 1) + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="boton-agregar"
                      onClick={() => {
                        agregarAlCarrito(prod, Number(cantidadesModal[prod.id]) || 1);
                        toastAgregado(prod.nombre, prod.imagenUrl);
                        setCantidadesModal((prev) => ({ ...prev, [prod.id]: "1" }));
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Volver arriba de la ventanita: el boton flotante de la pagina no
              sirve aqui porque mueve window, y el que scrollea es el panel. */}
          <button
            type="button"
            className={`volver-arriba volver-arriba--modal${
              panelDesplazado ? " volver-arriba--visible" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              panelCatalogoRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="Volver arriba en el catálogo"
            data-testid="modal-volver-arriba"
            tabIndex={panelDesplazado ? 0 : -1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
};

export default Pedido;
