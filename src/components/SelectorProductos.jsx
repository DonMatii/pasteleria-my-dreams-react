import { useState, useEffect, useRef } from "react";
import { obtenerProductos, aplanarCatalogo } from "../service/ProductosService";
import "../App.css";

// Ventanita del catálogo para elegir productos con cantidades (stepper −/+ y
// botón Agregar). Extraída tal cual de Pedido.jsx para reutilizar la MISMA
// interacción en el formulario de solicitud de la Versión 1: mismos roles,
// clases y comportamiento que ya conocen las pruebas del checkout.
// El dueño de la página decide qué pasa al agregar con `onAgregar` (el carrito
// en Pedido, la selección propia en Solicitud) y la delicia del día se marca
// solo cuando la página la confirma con la prop `delicia`.
const SelectorProductos = ({ abierto, onCerrar, onAgregar, delicia = null }) => {
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
    if (!abierto) return undefined;
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
  }, [abierto]);

  // Se escucha el scroll del PANEL, no el de la pagina: ese es el que se mueve
  // cuando hay muchos productos y el cliente pierde el titulo de arriba.
  useEffect(() => {
    if (!abierto) return undefined;
    const panel = panelCatalogoRef.current;
    if (!panel) return undefined;
    const alDesplazar = () => setPanelDesplazado(panel.scrollTop > 300);
    alDesplazar();
    panel.addEventListener("scroll", alDesplazar, { passive: true });
    return () => panel.removeEventListener("scroll", alDesplazar);
  }, [abierto]);

  // ¿Este producto de la ventanita es la delicia del día? Coincide por id (ambos
  // vienen del catálogo) y también por nombre, que es como ya decide el carrito
  // si aplica el descuento: si el backend cambia de fuente, aun asi se marca.
  const esDeliciaDelDia = (prod) => {
    if (!delicia || !prod) return false;
    const mismoId = delicia.id != null && prod.id === delicia.id;
    const mismoNombre =
      prod.nombre &&
      delicia.nombre &&
      prod.nombre.trim().toLowerCase() === delicia.nombre.trim().toLowerCase();
    return mismoId || mismoNombre;
  };

  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      data-testid="modal-catalogo"
      onClick={onCerrar}
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
          <button type="button" aria-label="Cerrar" onClick={onCerrar}>
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
                    onAgregar(prod, Number(cantidadesModal[prod.id]) || 1);
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
  );
};

export default SelectorProductos;
