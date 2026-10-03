import React, { useEffect, useState } from "react";
import "../App.css";
import Swal from "sweetalert2";
import { obtenerProductos } from "../service/ProductosService";
import { URL_BASE } from "../service/apiClient";

// RF-07: formulario nuevo para registrar un pedido real en el backend.
// El formulario de contacto (Contacto.jsx / Formspree, RF-06) queda intacto.
const Pedido = () => {
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");

  const [formData, setFormData] = useState({
    cliente: "",
    email: "",
    producto: "",
    cantidad: "1",
  });

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

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
    (prod) => String(prod.id) === String(formData.producto)
  );

  // Total en vivo: precioUnitario × cantidad (el backend recalcula el mismo total)
  const total = productoSeleccionado
    ? Number(productoSeleccionado.precio || 0) * Number(formData.cantidad || 0)
    : 0;

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "cantidad") {
      // Solo dígitos: la cantidad siempre será un entero
      setFormData({ ...formData, cantidad: value.replace(/\D/g, "") });
    } else {
      setFormData({ ...formData, [id]: value });
    }
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

    if (!formData.producto) {
      nuevosErrores.producto = "Selecciona un producto para tu pedido.";
      esValido = false;
    }

    const cantidad = Number(formData.cantidad);
    if (!formData.cantidad || !Number.isInteger(cantidad) || cantidad < 1) {
      nuevosErrores.cantidad = "La cantidad debe ser un entero mayor o igual a 1.";
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
    // La UI registra un solo producto por pedido, pero el contrato acepta una lista.
    const cuerpoPedido = {
      cliente: formData.cliente.trim(),
      email: formData.email.trim(),
      productos: [
        {
          nombre: productoSeleccionado.nombre,
          cantidad: Number(formData.cantidad),
          precioUnitario: Number(productoSeleccionado.precio),
        },
      ],
    };

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
        Swal.fire({
          icon: "success",
          title: "¡Pedido registrado!",
          text: `Pedido N° ${pedidoCreado?.id} por $${totalCreado.toLocaleString(
            "es-CL"
          )}. Tu código de seguimiento: ${codigoSeguimiento} (guárdalo para consultar el estado). Te enviaremos la confirmación a tu correo. 🧁`,
          confirmButtonColor: "#d95386",
        });
        setFormData({ cliente: "", email: "", producto: "", cantidad: "1" });
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
        Elige tu delicia favorita y la registramos al instante.
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
            <label htmlFor="producto">Producto:</label>
            <select
              id="producto"
              value={formData.producto}
              onChange={handleChange}
              className={errores.producto ? "input-error" : ""}
            >
              <option value="">
                {cargandoCatalogo
                  ? "Cargando productos..."
                  : errorCatalogo
                  ? "Productos no disponibles"
                  : "Selecciona un producto..."}
              </option>
              {productosCatalogo.map((prod) => (
                <option key={prod.id} value={String(prod.id)}>
                  {prod.nombre} — ${Number(prod.precio || 0).toLocaleString("es-CL")}
                </option>
              ))}
            </select>
            {errores.producto && <span className="error-text">{errores.producto}</span>}
            {errorCatalogo && <span className="error-text">{errorCatalogo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cantidad">Cantidad:</label>
            <input
              type="number"
              id="cantidad"
              min="1"
              value={formData.cantidad}
              onChange={handleChange}
              className={errores.cantidad ? "input-error" : ""}
              placeholder="1"
            />
            {errores.cantidad && <span className="error-text">{errores.cantidad}</span>}
          </div>

          <div className="form-group">
            <label>Total estimado:</label>
            <span className="precio-tag" data-testid="total-pedido">
              ${total.toLocaleString("es-CL")}
            </span>
          </div>

          <button type="submit" className="boton-principal" disabled={loading}>
            {loading ? "Registrando..." : "Registrar pedido"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Pedido;
