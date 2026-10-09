import React, { useEffect, useState } from "react";
import "../App.css";
import Swal from "sweetalert2";
import { obtenerProductos } from "../service/ProductosService";
import { URL_BASE } from "../service/apiClient";
import {
  obtenerCodigoBienvenida,
  consumirCodigoBienvenida,
  esCodigoValido,
} from "../service/BienvenidaService";

// RF-07: formulario nuevo para registrar un pedido real en el backend.
// El formulario de contacto (Contacto.jsx / Formspree, RF-06) queda intacto.
const Pedido = () => {
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");

  const [formData, setFormData] = useState({
    cliente: "",
    email: "",
  });

  // Carrito simple: el pedido puede llevar varios productos.
  // items = [{ id, nombre, precio, cantidad }]
  const [items, setItems] = useState([]);
  const [productoSel, setProductoSel] = useState("");
  const [cantidadSel, setCantidadSel] = useState("1");

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  // Codigo de bienvenida: prellenado solo si el cliente gano el descuento de primera conexion
  const [codigoDescuento, setCodigoDescuento] = useState(
    () => obtenerCodigoBienvenida() || ""
  );

  // El catálogo real vive en GET /api/productos y se pide por el servicio existente
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const datos = await obtenerProductos();
        // El endpoint devuelve un Map agrupado por categoría (como lo consume AdminPanel)
        const lista = Array.isArray(datos) ? datos : Object.values(datos).flat();
        setProductosCatalogo(lista.filter((prod) => prod && prod.nombre));
      } catch (error) {
        console.error("Error al cargar el catálogo para el pedido:", error);
        setErrorCatalogo("No se pudieron cargar los productos. Intenta nuevamente.");
      } finally {
        setCargandoCatalogo(false);
      }
    };

    cargarProductos();
  }, []);

  const productoSeleccionado = productosCatalogo.find(
    (prod) => String(prod.id) === String(productoSel)
  );

  // Total en vivo: suma de precio × cantidad de TODOS los items del carrito
  // (el backend recalcula el mismo total a partir de la lista)
  const total = items.reduce(
    (suma, item) => suma + Number(item.precio) * Number(item.cantidad),
    0
  );

  // Agregar el producto seleccionado (o sumar cantidad si ya esta en el carrito)
  const agregarAlCarrito = () => {
    if (!productoSeleccionado) {
      setErrores({ ...errores, producto: "Selecciona un producto para tu pedido." });
      return;
    }
    const cantidad = Number(cantidadSel);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setErrores({
        ...errores,
        cantidad: "La cantidad debe ser un entero mayor o igual a 1.",
      });
      return;
    }

    const existente = items.find((it) => String(it.id) === String(productoSel));
    if (existente) {
      setItems(
        items.map((it) =>
          String(it.id) === String(productoSel)
            ? { ...it, cantidad: Number(it.cantidad) + cantidad }
            : it
        )
      );
    } else {
      setItems([
        ...items,
        {
          id: productoSel,
          nombre: productoSeleccionado.nombre,
          precio: Number(productoSeleccionado.precio || 0),
          cantidad,
        },
      ]);
    }
    // Limpia la seleccion para agregar otro producto distinto
    setProductoSel("");
    setCantidadSel("1");
    setErrores({ ...errores, producto: "", cantidad: "" });
  };

  const quitarItem = (id) => {
    setItems(items.filter((it) => String(it.id) !== String(id)));
  };

  const cambiarCantidadItem = (id, nueva) => {
    const cantidad = Number(String(nueva).replace(/\D/g, ""));
    if (!cantidad || cantidad < 1) {
      // No se permiten cantidades invalidas: se ignora el cambio
      return;
    }
    setItems(
      items.map((it) =>
        String(it.id) === String(id) ? { ...it, cantidad } : it
      )
    );
  };

  // Descuento de bienvenida en vivo: -10% mientras el codigo sea valido Y siga disponible
  // (disponible = no canjeado: el codigo se gana una sola vez por navegador)
  const codigoValido = esCodigoValido(codigoDescuento);
  const codigoDisponible = Boolean(obtenerCodigoBienvenida());
  const descuento = codigoValido && codigoDisponible ? Math.floor(total / 10) : 0;
  const totalFinal = total - descuento;

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

    // Uso unico: un codigo ya canjeado (o nunca ganado en este navegador) no se vuelve a aplicar
    if (codigoDescuento.trim() && esCodigoValido(codigoDescuento) && !codigoDisponible) {
      nuevosErrores.codigoDescuento =
        "El código de bienvenida ya fue canjeado o no está disponible.";
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
    // Solo un codigo valido y disponible viaja al backend; la validacion corta el re-ingreso
    if (codigoValido && codigoDisponible) {
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
        // El codigo de bienvenida se canjea una sola vez
        if (descuento > 0) {
          consumirCodigoBienvenida();
        }
        const textoDescuento =
          descuento > 0
            ? ` Se aplicó tu descuento de bienvenida: -$${descuento.toLocaleString("es-CL")}.`
            : "";
        Swal.fire({
          icon: "success",
          title: "¡Pedido registrado!",
          text: `Pedido N° ${pedidoCreado?.id} por $${totalCreado.toLocaleString(
            "es-CL"
          )}. Tu código de seguimiento: ${codigoSeguimiento} (guárdalo para consultar el estado).${textoDescuento} Te enviaremos la confirmación a tu correo. 🧁`,
          confirmButtonColor: "#d95386",
        });
        setFormData({ cliente: "", email: "" });
        setItems([]);
        setProductoSel("");
        setCantidadSel("1");
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
        Arma tu pedido con una o varias delicias y la registramos al instante.
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

          <div className="form-group">
            <label id="etiqueta-producto">Agrega tus productos:</label>
            {cargandoCatalogo && <p className="selector-estado">Cargando productos...</p>}
            <div
              className="pedido-selector-grid"
              role="group"
              aria-labelledby="etiqueta-producto"
              data-testid="selector-productos"
            >
              {productosCatalogo.map((prod) => {
                const seleccionado = String(prod.id) === String(productoSel);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    className={`pedido-tarjeta${seleccionado ? " pedido-tarjeta-activa" : ""}`}
                    aria-pressed={seleccionado}
                    onClick={() => {
                      setProductoSel(String(prod.id));
                      if (errores.producto) setErrores({ ...errores, producto: "" });
                    }}
                  >
                    <img
                      src={`/img/${prod.imagenUrl || "alfajor.jpg"}`}
                      alt={prod.nombre}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = "/img/alfajor.jpg";
                      }}
                    />
                    <span className="pedido-tarjeta-nombre">{prod.nombre}</span>
                    <span className="pedido-tarjeta-precio">
                      ${Number(prod.precio || 0).toLocaleString("es-CL")}
                    </span>
                  </button>
                );
              })}
            </div>
            {errores.producto && <span className="error-text">{errores.producto}</span>}
            {errorCatalogo && <span className="error-text">{errorCatalogo}</span>}
          </div>

          <div className="form-group pedido-agregar-fila">
            <div className="pedido-agregar-campo">
              <label htmlFor="cantidadSel">Cantidad:</label>
              <input
                type="number"
                id="cantidadSel"
                min="1"
                value={cantidadSel}
                onChange={(e) =>
                  setCantidadSel(e.target.value.replace(/\D/g, ""))
                }
                className={errores.cantidad ? "input-error" : ""}
                placeholder="1"
              />
              {errores.cantidad && (
                <span className="error-text">{errores.cantidad}</span>
              )}
            </div>
            <button
              type="button"
              className="boton-secundario"
              onClick={agregarAlCarrito}
            >
              Agregar al pedido
            </button>
          </div>

          {items.length > 0 && (
            <div className="form-group" data-testid="carrito-pedido">
              <label>Tu pedido:</label>
              <ul className="pedido-carrito">
                {items.map((it) => (
                  <li key={it.id} className="pedido-carrito-item">
                    <span className="pedido-carrito-nombre">{it.nombre}</span>
                    <input
                      type="number"
                      min="1"
                      aria-label={`Cantidad de ${it.nombre}`}
                      value={it.cantidad}
                      onChange={(e) =>
                        cambiarCantidadItem(it.id, e.target.value)
                      }
                      className="pedido-carrito-cantidad"
                    />
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
            </div>
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

          <div className="form-group">
            <label>Total estimado:</label>
            <span className="precio-tag" data-testid="total-pedido">
              ${total.toLocaleString("es-CL")}
            </span>
          </div>

          {codigoValido && codigoDisponible && (
            <div className="form-group" data-testid="resumen-descuento">
              <label>Descuento de bienvenida (-10%):</label>
              <span className="precio-tag" data-testid="descuento-bienvenida">
                -${descuento.toLocaleString("es-CL")}
              </span>
              <p
                style={{ margin: "8px 0 0", fontWeight: "bold" }}
                data-testid="total-final"
              >
                Total con descuento: ${totalFinal.toLocaleString("es-CL")}
              </p>
            </div>
          )}

          <button type="submit" className="boton-principal" disabled={loading}>
            {loading ? "Registrando..." : "Registrar pedido"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Pedido;
