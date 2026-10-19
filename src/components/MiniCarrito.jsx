import { Link } from "react-router-dom";
import { useCarrito } from "../context/CarritoContext";

// Mini carrito: panel lateral que se abre desde el header.
// Muestra los items del carrito compartido, permite ajustar cantidades,
// quitar productos e ir al pedido. Visible sin iniciar sesión.
function MiniCarrito({ abierto, onCerrar }) {
  const { items, cambiarCantidad, quitarItem, limpiarCarrito, total, cantidadTotal } =
    useCarrito();

  if (!abierto) return null;

  return (
    <div
      className="mini-carrito-overlay"
      onClick={onCerrar}
      data-testid="mini-carrito-overlay"
    >
      <aside
        className="mini-carrito-panel"
        onClick={(e) => e.stopPropagation()}
        aria-label="Carrito de compras"
      >
        <div className="mini-carrito-header">
          <h2>Tu carrito</h2>
          <button
            type="button"
            className="mini-carrito-cerrar"
            aria-label="Cerrar carrito"
            onClick={onCerrar}
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="mini-carrito-vacio">
            <p>Tu carrito está vacío.</p>
            <Link
              to="/delicias"
              className="boton-secundario"
              onClick={onCerrar}
            >
              Ver delicias
            </Link>
          </div>
        ) : (
          <>
            <ul className="mini-carrito-lista">
              {items.map((it) => (
                <li key={it.id} className="mini-carrito-item">
                  <div className="mini-carrito-item-info">
                    <span className="mini-carrito-nombre">{it.nombre}</span>
                    <span className="mini-carrito-precio-unit">
                      ${Number(it.precio).toLocaleString("es-CL")} c/u
                    </span>
                  </div>

                  <div className="mini-carrito-controles">
                    <button
                      type="button"
                      aria-label={`Restar ${it.nombre}`}
                      onClick={() => cambiarCantidad(it.id, it.cantidad - 1)}
                    >
                      −
                    </button>
                    <span className="mini-carrito-cantidad">{it.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Sumar ${it.nombre}`}
                      onClick={() => cambiarCantidad(it.id, it.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>

                  <span className="mini-carrito-subtotal">
                    ${(Number(it.precio) * Number(it.cantidad)).toLocaleString("es-CL")}
                  </span>

                  <button
                    type="button"
                    className="mini-carrito-quitar"
                    aria-label={`Quitar ${it.nombre}`}
                    onClick={() => quitarItem(it.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="mini-carrito-footer">
              <div className="mini-carrito-resumen">
                <span>Productos: {cantidadTotal}</span>
                <span
                  className="mini-carrito-total"
                  data-testid="mini-carrito-total"
                >
                  Total: ${total.toLocaleString("es-CL")}
                </span>
              </div>

              <Link
                to="/pedido"
                className="boton-principal mini-carrito-finalizar"
                onClick={onCerrar}
              >
                Ir a mi pedido
              </Link>

              <button
                type="button"
                className="mini-carrito-vaciar"
                onClick={limpiarCarrito}
              >
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default MiniCarrito;
