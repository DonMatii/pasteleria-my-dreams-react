import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { obtenerPedidos, cambiarEstadoPedido } from "../service/PedidosService";

// Panel de gestion de pedidos para la administradora (S5/S6).
// Muestra QUIEN compro cada pedido, en que estado esta y permite moverlo por el
// ciclo de vida. El backend valida el estado y, al persistirlo, publica el evento
// Kafka que hace llegar el correo al cliente: el panel no envia correos, solo pide
// el cambio.
function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [abierto, setAbierto] = useState(true);
  const [ordenPedidos, setOrdenPedidos] = useState({ campo: "fecha", dir: "desc" });
  const [pagina, setPagina] = useState(1);
  const PEDIDOS_POR_PAGINA = 5;

  // Mismo orden y mismos codigos que valida PedidoService.ESTADOS_VALIDOS
  const ESTADOS = [
    { codigo: "RECIBIDO", etiqueta: "Recibido" },
    { codigo: "EN_PREPARACION", etiqueta: "En preparación" },
    { codigo: "DESPACHADO", etiqueta: "Despachado" },
    { codigo: "ENTREGADO", etiqueta: "Entregado" },
  ];

  const etiquetaDe = (codigo) =>
    ESTADOS.find((estado) => estado.codigo === codigo)?.etiqueta || codigo;

  // Normaliza un nombre de producto (minúsculas, sin tildes ni espacios)
  // para buscarle la imagen en /img/. Si no hay coincidencia, usa alfajor.jpg.
  const normalizar = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const IMAGENES = [
    "alfajor.jpg", "brownieChocolateNuez.jpg", "carlotaMango.jpg",
    "cupcakesVariedades.jpg", "donasGlaseadas.jpg", "kutchenDeManzana.jpg",
    "logoPasteleria.png", "miniTartaletas.jpg", "muffinsPlatanoArandano.jpg",
    "pieDeLimon.jpg", "pieMaracuya.jpg", "quequeArandano.jpg",
    "quequeChoc.jpg", "quequeMarmoladoVainilla.jpg", "quequePlatano.jpg",
    "quequeVainilla.jpg", "rollosDeCanela.jpg", "tartaletaFrutas.jpg",
    "tartaYogurth.jpg", "torta3Leches.jpg", "tortaCremaPina.jpg",
    "tortaManjarLucuma.jpg", "tortaManjarNuez.jpg", "tortaMerengueFrambueza.jpg",
    "tortaMoka.jpg", "tortaSelvaNegra.jpg",
  ];

  // Alias por si el nombre del pedido no calza exactamente con el archivo
  const ALIAS = {
    "tortadechocolate": "tortaMoka.jpg",
    "tartadeframbuesa": "tartaletaFrutas.jpg",
    "tortadeyogur": "tartaYogurth.jpg",
    "quequemarmolado": "quequeMarmoladoVainilla.jpg",
  };

  const imagenDe = (nombre) => {
    const key = normalizar(nombre);
    const archivo = ALIAS[key] || IMAGENES.find((f) => normalizar(f.replace(/\.(jpg|png)$/, "")) === key);
    return archivo ? `/img/${archivo}` : "/img/alfajor.jpg";
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setPedidos(await obtenerPedidos());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pedidosOrdenados = useMemo(() => {
    const arr = [...pedidos];
    const { campo, dir } = ordenPedidos;
    arr.sort((a, b) => {
      let cmp = 0;
      if (campo === "fecha") {
        cmp = new Date(a.fecha) - new Date(b.fecha);
      } else if (campo === "total") {
        cmp = Number(a.total || 0) - Number(b.total || 0);
      } else if (campo === "cliente") {
        cmp = String(a.cliente || "").localeCompare(String(b.cliente || ""), "es");
      } else if (campo === "estado") {
        cmp = String(a.estado || "").localeCompare(String(b.estado || ""), "es");
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [pedidos, ordenPedidos]);

  const totalPaginas = Math.max(1, Math.ceil(pedidosOrdenados.length / PEDIDOS_POR_PAGINA));
  const pedidosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * PEDIDOS_POR_PAGINA;
    return pedidosOrdenados.slice(inicio, inicio + PEDIDOS_POR_PAGINA);
  }, [pedidosOrdenados, pagina]);

  const cambiarOrden = (campo) => {
    setOrdenPedidos(prev => ({
      campo,
      dir: prev.campo === campo && prev.dir === "desc" ? "asc" : "desc"
    }));
    setPagina(1);
  };

  // Pide confirmacion, aplica el cambio y recarga para verlo reflejado.
  // El correo al cliente lo dispara el backend, no esta vista.
  const aplicarEstado = async (pedido, estado) => {
    const { isConfirmed } = await Swal.fire({
      title: `Marcar como "${estado.etiqueta}"`,
      text: `El pedido de ${pedido.cliente} quedará en estado "${estado.etiqueta}". ` +
        "Le llegará un correo avisándole.",
      icon: "question",
      iconColor: "#d95386",
      showCancelButton: true,
      confirmButtonColor: "#d95386",
      cancelButtonColor: "#b04e6f",
      confirmButtonText: "Sí, cambiar estado",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;

    setGuardandoId(pedido.id);
    try {
      const actualizado = await cambiarEstadoPedido(pedido.id, estado.codigo);
      if (actualizado) {
        await cargar();
        Swal.fire({
          toast: true,
          position: "top",
          icon: "success",
          title: `Pedido de ${pedido.cliente}: ${estado.etiqueta}`,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Error", "No se pudo cambiar el estado. Verifica tu conexión o sesión.", "error");
      }
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <section className="admin-pedidos" aria-label="Pedidos recibidos">
      <div className="admin-seccion-cabecera">
        <h3 className="admin-pedidos-titulo">📁 Pedidos recibidos</h3>
        <div className="admin-orden" role="group" aria-label="Ordenar pedidos recibidos">
          <span className="admin-orden-etiqueta">Ordenar por:</span>
          {[
            { campo: "fecha", etiqueta: "Fecha" },
            { campo: "cliente", etiqueta: "Cliente" },
            { campo: "total", etiqueta: "Monto" },
            { campo: "estado", etiqueta: "Estado" },
          ].map((c) => (
            <button
              key={c.campo}
              type="button"
              className={`admin-orden-btn${
                ordenPedidos.campo === c.campo ? " admin-orden-activo" : ""
              }`}
              aria-pressed={ordenPedidos.campo === c.campo}
              onClick={() => cambiarOrden(c.campo)}
            >
              {c.etiqueta}
              {ordenPedidos.campo === c.campo &&
                (ordenPedidos.dir === "desc" ? " ↓" : " ↑")}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            className="admin-btn-pill"
            onClick={cargar}
            disabled={cargando}
          >
            {cargando ? "Cargando pedidos..." : "Recargar pedidos"}
          </button>
          <button
            type="button"
            className="admin-btn-cerrar"
            aria-label="Cerrar Pedidos recibidos"
            aria-expanded={abierto}
            onClick={() => setAbierto(v => !v)}
          >
            {abierto ? "✕ Cerrar" : "Abrir"}
          </button>
        </div>
      </div>

      {abierto ? (
        cargando && pedidos.length === 0 ? (
          <p className="admin-pedidos-vacio" data-testid="pedidos-cargando">Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="admin-pedidos-vacio" data-testid="pedidos-vacio">
            Todavía no hay pedidos registrados.
          </p>
        ) : (
          <div className="admin-tabla-container">
            <table className="admin-tabla admin-pedidos-tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Código</th>
                  <th scope="col">Productos</th>
                  <th scope="col">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Cambiar estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosPaginados.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="admin-pedidos-fecha">{formatearFecha(pedido.fecha)}</td>
                    <td>
                      <span className="admin-pedidos-cliente" title={pedido.cliente}>
                        {pedido.cliente}
                      </span>
                      <span className="admin-pedidos-email" title={pedido.email}>
                        {pedido.email}
                      </span>
                    </td>
                    <td className="admin-pedidos-codigo">
                      <code title={pedido.codigoConsulta || ""}>
                        {pedido.codigoConsulta || "—"}
                      </code>
                    </td>
                    <td>
                      <div className="admin-pedidos-productos">
                        {(pedido.productos || []).map((producto) => {
                          const src = imagenDe(producto.nombre);
                          return (
                            <span key={producto.nombre} className="admin-pedidos-producto" title={producto.nombre}>
                              <img
                                src={src}
                                alt=""
                                className="admin-pedidos-img-chip"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.target.src = "/img/alfajor.jpg"; }}
                              />
                              {producto.nombre} ×{producto.cantidad}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="admin-pedidos-total">
                      ${(Number(pedido.total) || 0).toLocaleString("es-CL")}
                    </td>
                    <td>
                      <span
                        className={`admin-pedidos-estado admin-estado-${(pedido.estado || "").toLowerCase()}`}
                        data-testid="estado-actual"
                      >
                        {etiquetaDe(pedido.estado)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-pedidos-estado-fila" role="group"
                        aria-label={`Estado del pedido de ${pedido.cliente}`}>
                        <select
                          value={pedido.estado}
                          onChange={(e) => {
                            const estado = ESTADOS.find(es => es.codigo === e.target.value);
                            if (estado) aplicarEstado(pedido, estado);
                          }}
                          disabled={guardandoId === pedido.id}
                          className={`admin-pedidos-estado-select admin-estado-${(pedido.estado || "").toLowerCase()}`}
                        >
                          {ESTADOS.map((estado) => (
                            <option key={estado.codigo} value={estado.codigo}>
                              {estado.etiqueta}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPaginas > 1 && (
              <div className="admin-paginacion">
                <span className="admin-paginacion-texto">
                  Mostrando {pedidosPaginados.length} de {pedidosOrdenados.length} pedidos
                </span>
                <button
                  className={`admin-pagina-btn${pagina === 1 ? " admin-pagina-activa" : ""}`}
                  disabled={pagina === 1}
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  〈 Anterior
                </button>
                {[...Array(totalPaginas)].map((_, i) => {
                  const num = i + 1;
                  return (
                    <button
                      key={num}
                      className={`admin-pagina-btn${pagina === num ? " admin-pagina-activa" : ""}`}
                      onClick={() => setPagina(num)}
                      aria-label={`Página ${num}`}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  className={`admin-pagina-btn${pagina === totalPaginas ? " admin-pagina-activa" : ""}`}
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  aria-label="Página siguiente"
                >
                  Siguiente 〉
                </button>
              </div>
            )}
          </div>
        )
      ) : null}
    </section>
  );
}

// Fecha y hora en formato local chileno: el backend envia un instante UTC (Z)
function formatearFecha(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default AdminPedidos;
