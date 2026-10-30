import React, { useEffect, useMemo, useRef, useState } from "react";
import { obtenerProductos, crearProducto, actualizarProducto, eliminarProducto } from "../service/ProductosService";
import { obtenerEstadisticas, guardarMetas } from "../service/EstadisticasService";
import { obtenerVentasPorProducto, obtenerPedidos } from "../service/PedidosService";
import AdminPedidos from "../components/AdminPedidos";
import "./AdminPanel.css";
import Swal from "sweetalert2";

// La fecha ISO del backend se muestra en el formato corto chileno (21-10-2026);
// la hora fija evita que el huso horario corra el día hacia atrás
const formatearFecha = (fechaIso) => new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-CL");

// Moneda chilena sin decimales, con separador de miles (48.990)
const formatearMoneda = (valor) => Number(valor ?? 0).toLocaleString("es-CL");

// Los tres periodos del dashboard (en curso), con su etiqueta corta y su frase
const PERIODOS = [
  { id: "dia", etiqueta: "Día", frase: "Hoy" },
  { id: "semana", etiqueta: "Semana", frase: "esta semana" },
  { id: "mes", etiqueta: "Mes", frase: "este mes" },
];

function AdminPanel() {
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [stats, setStats] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    imagenUrl: "",
    categoria: "",
    activo: true,
  });

  // Dashboard: periodo elegido, ventas por producto del periodo y edicion de la meta
  const [periodo, setPeriodo] = useState("dia");
  const [ventasPorProducto, setVentasPorProducto] = useState([]);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaEnEdicion, setMetaEnEdicion] = useState("");

  // Orden de "Que se vendio" y de la tabla de 7 dias, y estado plegado de cada seccion
  const [ordenVendidos, setOrdenVendidos] = useState({ campo: "unidades", dir: "desc" });
  const [ordenDiario, setOrdenDiario] = useState({ campo: "fecha", dir: "desc" });
  const [vendidosAbiertos, setVendidosAbiertos] = useState(true);
  const [diarioAbierto, setDiarioAbierto] = useState(true);
  const [topAbierto, setTopAbierto] = useState(true);

  const username = sessionStorage.getItem("userName") || "Administradora";

  // Contenedor del formulario de gestion (Nuevo Ingreso / Modificar Dulce)
  const formEdicionRef = useRef(null);

const cargarDatos = () => {
    obtenerProductos().then((data) => {
      /*Extraemos las listas del Map y las unimos en un solo Array plano
        Así la tabla recibe exactamente lo que necesita sin cambiar su diseño
      */
      const arrayData = Array.isArray(data) ? data : Object.values(data).flat();
      const ordenados = (arrayData || []).sort((a, b) => a.id - b.id);
      setProductos(ordenados);
    }).catch(error => {
      console.error("Error al cargar los datos del catálogo:", error);
    });
  };

  const cargarEstadisticas = async () => {
    try {
      const data = await obtenerEstadisticas();
      setStats(data);
    } catch (error) {
      console.error("Error al conectar con estadisticas-service:", error);
    }
  };

  const cargarPedidos = async () => {
    try {
      const data = await obtenerPedidos();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      setPedidos([]);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarEstadisticas();
    cargarPedidos();
  }, []);

  // Cifras del periodo elegido; el dia usa las de hoy, que siempre estan presentes
  const ventasPeriodoSel = useMemo(() => {
    if (periodo === "dia") {
      return { monto: stats?.montoVentasHoy ?? 0, pedidos: stats?.pedidosHoy ?? 0 };
    }
    return stats?.ventasPeriodo?.[periodo] ?? { monto: 0, pedidos: 0 };
  }, [stats, periodo]);

  // El periodo elegido, para las etiquetas del dashboard
  const periodoActual = PERIODOS.find((p) => p.id === periodo) ?? PERIODOS[0];

  // Meta del periodo elegido (0 = todavia sin meta definida)
  const metaActual = Number(stats?.metas?.[periodo] ?? 0);

  // Avance de ventas hacia la meta, redondeado al entero mas cercano (sin pasar del 100%)
  const porcentaje =
    metaActual > 0
      ? Math.min(100, Math.round((Number(ventasPeriodoSel.monto ?? 0) / metaActual) * 100))
      : 0;

  // Pide a pedidos-service que se vendio en el rango del periodo elegido
  useEffect(() => {
    const rango = stats?.ventasPeriodo?.[periodo];
    if (!rango?.desde || !rango?.hasta) return;
    let vigente = true;
    obtenerVentasPorProducto(rango.desde, rango.hasta).then((lista) => {
      if (vigente) setVentasPorProducto(lista);
    });
    return () => {
      vigente = false;
    };
  }, [stats, periodo]);

  // Foto del producto vendido: la resuelve contra el catalogo ya cargado
  const imagenDe = (nombre) =>
    productos.find((p) => p.nombre === nombre)?.imagenUrl || "alfajor.jpg";

  // Los 3 mas vendidos del periodo, siempre por unidades: el ranking de referencia (Cathi)
  const vendidosTop = useMemo(
    () =>
      [...ventasPorProducto]
        .sort((a, b) => (Number(b.unidades) || 0) - (Number(a.unidades) || 0))
        .slice(0, 3),
    [ventasPorProducto]
  );

  // La lista completa de que se vendio, con el orden que eligio la administradora
  const vendidosOrdenados = useMemo(() => {
    const arr = [...ventasPorProducto];
    const { campo, dir } = ordenVendidos;
    arr.sort((a, b) => {
      const cmp =
        campo === "nombre"
          ? String(a.nombre).localeCompare(String(b.nombre), "es")
          : (Number(a[campo]) || 0) - (Number(b[campo]) || 0);
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [ventasPorProducto, ordenVendidos]);

  // La tabla de 7 dias con el orden elegido (por defecto, de mas reciente a mas antiguo)
  const diarioOrdenado = useMemo(() => {
    if (!Array.isArray(stats?.ventasDiarias)) return [];
    // Agrupar productos por fecha usando los pedidos cargados
    const productosPorFecha = new Map();
    (pedidos || []).forEach(p => {
      const fecha = new Date(p.fecha).toISOString().slice(0,10);
      if (!productosPorFecha.has(fecha)) productosPorFecha.set(fecha, []);
      (p.productos || []).forEach(prod => {
        productosPorFecha.get(fecha).push({
          nombre: prod.nombre,
          imagen: prod.imagen || `/img/${prod.nombre.toLowerCase().replace(/\s+/g,'-')}.jpg`,
          cantidad: prod.cantidad
        });
      });
    });
    const arr = stats.ventasDiarias.map(v => {
      const productos = productosPorFecha.get(v.fecha) || [];
      // Des-duplicar por nombre sumando cantidad
      const mapa = new Map();
      productos.forEach(p => {
        const key = p.nombre.toLowerCase();
        if (mapa.has(key)) {
          mapa.get(key).cantidad += p.cantidad;
        } else {
          mapa.set(key, { ...p });
        }
      });
      return { ...v, productos: Array.from(mapa.values()) };
    });
    const { campo, dir } = ordenDiario;
    arr.sort((a, b) => {
      const cmp =
        campo === "fecha"
          ? String(a.fecha).localeCompare(String(b.fecha))
          : (Number(a[campo]) || 0) - (Number(b[campo]) || 0);
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [stats?.ventasDiarias, ordenDiario, pedidos]);

  // Cambia el campo de orden; si ya era ese campo, invierte la direccion
  const cambiarOrdenVendidos = (campo) => {
    setOrdenVendidos((prev) =>
      prev.campo === campo
        ? { campo, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { campo, dir: campo === "nombre" ? "asc" : "desc" }
    );
  };

  const cambiarOrdenDiario = (campo) => {
    setOrdenDiario((prev) =>
      prev.campo === campo
        ? { campo, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { campo, dir: "desc" }
    );
  };

  // Abre o cierra la edicion de la meta del periodo, precargando la actual
  const alternarEdicionMeta = () => {
    if (editandoMeta) {
      setEditandoMeta(false);
      return;
    }
    setMetaEnEdicion(String(metaActual));
    setEditandoMeta(true);
  };

  // Guarda las metas de los tres periodos (la del periodo elegido con el valor nuevo)
  const guardarMeta = async (e) => {
    e.preventDefault();
    const nuevas = {
      dia: Number(stats?.metas?.dia ?? 0),
      semana: Number(stats?.metas?.semana ?? 0),
      mes: Number(stats?.metas?.mes ?? 0),
      [periodo]: Number(metaEnEdicion) || 0,
    };
    try {
      await guardarMetas(nuevas);
      await cargarEstadisticas();
      setEditandoMeta(false);
    } catch (error) {
      console.error("Error al guardar la meta:", error);
      Swal.fire("Error", "No se pudo guardar la meta.", "error");
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    const valorFinal = id === "precio" ? parseFloat(value) || "" : value;
    setNuevoProducto({ ...nuevoProducto, [id]: valorFinal });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria || !nuevoProducto.imagenUrl) {
      Swal.fire({
        title: "Campos incompletos",
        text: "Por favor, completa todos los datos del dulce antes de continuar. 🧁",
        icon: "warning",
        confirmButtonColor: "#d95386",
      });
      return;
    }

    try {
      if (editandoId) {
        await actualizarProducto(editandoId, nuevoProducto);
        Swal.fire({
          title: "¡Éxito!",
          text: "Producto actualizado correctamente",
          icon: "success",
          confirmButtonColor: "#d95386",
          timer: 2000,
        });
      } else {
        await crearProducto(nuevoProducto);
        Swal.fire({
          title: "¡Éxito!",
          text: "🍰 ¡Nueva Delicia agregada!",
          icon: "success",
          confirmButtonColor: "#d95386",
          timer: 2000,
        });
      }
      resetearFormulario();
      cargarDatos();
      cargarEstadisticas();
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar. Verifica tu conexión o sesión.", "error");
    }
  };

  const manejarEliminar = (id) => {
    Swal.fire({
      title: "¿Eliminar de vitrina?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d95386",
      cancelButtonColor: "#5d405d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarProducto(id);
          Swal.fire("Eliminado", "El producto ha sido quitado.", "success");
          cargarDatos();
          cargarEstadisticas();
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar el producto.", "error");
        }
      }
    });
  };

  const prepararEdicion = (prod) => {
    setEditandoId(prod.id);
    setNuevoProducto({ ...prod });
    // el scroll lo lleva el useEffect al formulario Modificar Dulce,
    // no al tope de la pagina
  };

  const resetearFormulario = () => {
    setEditandoId(null);
    setNuevoProducto({
      nombre: "",
      descripcion: "",
      precio: "",
      imagenUrl: "",
      categoria: "",
      activo: true,
    });
  };

  // Al entrar en modo edicion (o cambiar de producto editado), el scroll
  // salta al formulario Modificar Dulce respetando prefers-reduced-motion.
  // (opt-in con ?. porque jsdom no implementa scrollIntoView)
  useEffect(() => {
    if (!editandoId || !formEdicionRef.current) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    formEdicionRef.current.scrollIntoView?.({
      behavior: reducir ? "auto" : "smooth",
      block: "start",
    });
  }, [editandoId]);

  return (
    <div className="admin-layout-container fondo-pagina">
      <div className="admin-panel-card">
        <h1 className="admin-titulo-principal">Gestión My Dreams</h1>
        <p className="admin-subtitulo-bienvenida">
          Bienvenida, <span className="admin-user-name">{username}</span> 
        </p>

        {/* Dashboard de ventas: periodo, KPIs, avance a meta y productos vendidos */}
        {stats && (
          <section className="admin-dashboard" aria-label="Dashboard de ventas">
            <div className="admin-dashboard-cabecera">
              <h2 className="admin-dashboard-titulo">Resumen de ventas</h2>
              <div className="admin-periodos" role="tablist" aria-label="Periodo de ventas">
                {PERIODOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={periodo === p.id}
                    className={`admin-periodo-btn${periodo === p.id ? " admin-periodo-activo" : ""}`}
                    onClick={() => setPeriodo(p.id)}
                  >
                    {p.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Primero las cifras del periodo elegido, luego los totales del catalogo */}
            <div className="admin-kpis">
              <div className="admin-kpi admin-kpi-destacado">
                <span className="admin-kpi-etiqueta">Ventas {periodoActual.frase}</span>
                <strong className="admin-kpi-valor">${formatearMoneda(ventasPeriodoSel.monto)}</strong>
              </div>
              <div className="admin-kpi admin-kpi-destacado">
                <span className="admin-kpi-etiqueta">Pedidos {periodoActual.frase}</span>
                <strong className="admin-kpi-valor">{ventasPeriodoSel.pedidos ?? 0}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-etiqueta">💰 Ventas totales</span>
                <strong className="admin-kpi-valor">${formatearMoneda(stats.montoTotalPedidos)}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-etiqueta">🧾 Pedidos recibidos</span>
                <strong className="admin-kpi-valor">{stats.pedidosTotales ?? 0}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-etiqueta">📦 Total catálogo</span>
                <strong className="admin-kpi-valor">{stats.totalProductosCatalogo ?? 0}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-etiqueta">🏷️ Categorías</span>
                <strong className="admin-kpi-valor">{stats.categoriasActivas ?? 0}</strong>
              </div>
            </div>

            {/* Barra de avance hacia la meta del periodo, editable desde el panel */}
            <div className="admin-meta">
              <div className="admin-meta-cabecera">
                <span className="admin-meta-titulo">Avance hacia la meta</span>
                <button type="button" className="admin-meta-btn" onClick={alternarEdicionMeta}>
                  {editandoMeta ? "Cancelar" : "✏️ Editar meta"}
                </button>
              </div>

              {editandoMeta ? (
                <form className="admin-meta-form" onSubmit={guardarMeta}>
                  <div className="admin-meta-campo">
                    <label htmlFor="meta-periodo">
                      Meta de ventas {periodoActual.frase} (en pesos)
                    </label>
                    <div className="admin-meta-input">
                      <span className="admin-meta-simbolo" aria-hidden="true">$</span>
                      <input
                        id="meta-periodo"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="150000"
                        value={metaEnEdicion}
                        onChange={(e) => setMetaEnEdicion(e.target.value)}
                      />
                    </div>
                    <p className="admin-meta-ayuda">
                      Escribe el monto en pesos que quieres vender en el período. Ejemplo:
                      150000 equivale a $150.000.
                    </p>
                  </div>
                  <button type="submit" className="admin-meta-guardar">Guardar meta</button>
                </form>
              ) : metaActual > 0 ? (
                <>
                  <p className="admin-meta-texto" data-testid="meta-texto">
                    Ventas de {periodoActual.frase.toLowerCase()}:{" "}
                    <strong>${formatearMoneda(ventasPeriodoSel.monto)}</strong> de una meta de{" "}
                    <strong>${formatearMoneda(metaActual)}</strong>
                  </p>
                  <div
                    className="admin-barra"
                    role="progressbar"
                    aria-valuenow={porcentaje}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`Avance de ventas ${periodoActual.frase}`}
                  >
                    <div className="admin-barra-relleno" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <span className="admin-meta-porcentaje">
                    {porcentaje >= 100 ? "¡Meta alcanzada! 🎉" : `Avance: ${porcentaje}%`}
                  </span>
                </>
              ) : (
                <p className="admin-meta-vacia">
                  Todavía no defines una meta para {periodoActual.frase.toLowerCase()}. Edítala
                  para ver el avance.
                </p>
              )}
            </div>

            {/* Los 3 productos mas vendidos del periodo, como ranking destacado (Cathi) */}
            {vendidosTop.length > 0 && (
              <div className="admin-top">
                <div className="admin-seccion-cabecera">
                  <h3 className="admin-top-titulo">🏆 Más vendidos ({periodoActual.frase.toLowerCase()})</h3>
                  <button
                    type="button"
                    className="admin-pliegue-btn"
                    aria-label="Más vendidos"
                    aria-expanded={topAbierto}
                    onClick={() => setTopAbierto((v) => !v)}
                  >
                    {topAbierto ? "Cerrar" : "Abrir"}
                  </button>
                </div>
                {topAbierto && (
                  <ol className="admin-top-lista" data-testid="lista-top">
                    {vendidosTop.map((venta, i) => (
                      <li key={venta.nombre} className="admin-top-item">
                        <span className="admin-top-medalla" aria-hidden="true">
                          {["🥇", "🥈", "🥉"][i]}
                        </span>
                        <img
                          src={`/img/${imagenDe(venta.nombre)}`}
                          alt={venta.nombre}
                          className="admin-top-img"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.target.src = "/img/alfajor.jpg";
                          }}
                        />
                        <div className="admin-top-datos">
                          <span className="admin-top-nombre">{venta.nombre}</span>
                          <span className="admin-top-unidades">{venta.unidades} unidades</span>
                        </div>
                        <span className="admin-top-monto">${formatearMoneda(venta.monto)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Que se vendio en el periodo: ordenable por producto/valor/unidades y plegable */}
            <div className="admin-vendidos">
              <div className="admin-seccion-cabecera">
                <h3 className="admin-vendidos-titulo">Qué se vendió ({periodoActual.frase.toLowerCase()})</h3>
                <button
                  type="button"
                  className="admin-pliegue-btn"
                  aria-label="Qué se vendió"
                  aria-expanded={vendidosAbiertos}
                  onClick={() => setVendidosAbiertos((v) => !v)}
                >
                  {vendidosAbiertos ? "Cerrar" : "Abrir"}
                </button>
              </div>
              {vendidosAbiertos &&
                (ventasPorProducto.length === 0 ? (
                  <p className="admin-vendidos-vacio">
                    Sin ventas registradas en {periodoActual.frase.toLowerCase()}.
                  </p>
                ) : (
                  <>
                    <div className="admin-orden" role="group" aria-label="Ordenar qué se vendió">
                      <span className="admin-orden-etiqueta">Ordenar por:</span>
                      {[
                        { campo: "nombre", etiqueta: "Producto" },
                        { campo: "monto", etiqueta: "Valor" },
                        { campo: "unidades", etiqueta: "Unidades" },
                      ].map((c) => (
                        <button
                          key={c.campo}
                          type="button"
                          className={`admin-orden-btn${
                            ordenVendidos.campo === c.campo ? " admin-orden-activo" : ""
                          }`}
                          aria-pressed={ordenVendidos.campo === c.campo}
                          onClick={() => cambiarOrdenVendidos(c.campo)}
                        >
                          {c.etiqueta}
                          {ordenVendidos.campo === c.campo &&
                            (ordenVendidos.dir === "asc" ? " ↑" : " ↓")}
                        </button>
                      ))}
                    </div>
                    <ul className="admin-vendidos-lista" data-testid="lista-vendidos">
                      {vendidosOrdenados.map((venta) => (
                        <li key={venta.nombre} className="admin-vendido">
                          <img
                            src={`/img/${imagenDe(venta.nombre)}`}
                            alt={venta.nombre}
                            className="admin-vendido-img"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.target.src = "/img/alfajor.jpg";
                            }}
                          />
                          <span className="admin-vendido-nombre">{venta.nombre}</span>
                          <span className="admin-vendido-unidades">{venta.unidades} unidades</span>
                          <span className="admin-vendido-monto">${formatearMoneda(venta.monto)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ))}
            </div>

            {/* Ventas de los últimos 7 días: ordenables por columna y plegables */}
            {Array.isArray(stats?.ventasDiarias) && stats.ventasDiarias.length > 0 && (
              <div className="admin-diario">
                <div className="admin-seccion-cabecera">
                  <h3 className="admin-diario-titulo">Ventas de los últimos 7 días</h3>
                  <button
                    type="button"
                    className="admin-pliegue-btn"
                    aria-label="Ventas de los últimos 7 días"
                    aria-expanded={diarioAbierto}
                    onClick={() => setDiarioAbierto((v) => !v)}
                  >
                    {diarioAbierto ? "Cerrar" : "Abrir"}
                  </button>
                </div>
                {diarioAbierto && (
                  <table className="admin-tabla" aria-label="Ventas de los últimos 7 días">
                    <thead>
                      <tr>
                        {[
                          { campo: "fecha", etiqueta: "Fecha" },
                          { campo: "pedidos", etiqueta: "Pedidos" },
                          { campo: "monto", etiqueta: "Ventas" },
                          { campo: "productos", etiqueta: "Productos" },
                        ].map((c) => (
                          <th
                            key={c.campo}
                            aria-sort={
                              ordenDiario.campo === c.campo
                                ? ordenDiario.dir === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <button
                              type="button"
                              className="admin-th-btn"
                              onClick={() => c.campo !== "productos" && cambiarOrdenDiario(c.campo)}
                              disabled={c.campo === "productos"}
                              style={c.campo === "productos" ? { cursor: "default" } : undefined}
                            >
                              {c.etiqueta}
                              {ordenDiario.campo === c.campo &&
                                (ordenDiario.dir === "asc" ? " ↑" : " ↓")}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diarioOrdenado.map((venta) => (
                        <tr key={venta.fecha}>
                          <td>{formatearFecha(venta.fecha)}</td>
                          <td>{venta.pedidos}</td>
                          <td>${Number(venta.monto ?? 0).toLocaleString("es-CL")}</td>
                          <td>
                            {Array.isArray(venta.productos) && venta.productos.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-start" }}>
                                {venta.productos.slice(0, 4).map((p) => (
                                  <div key={p.nombre} className="admin-vendido-mini" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff", border: "1px solid #f0d7e3", borderRadius: "8px", padding: "4px 8px" }}>
                                    {p.imagen && (
                                      <img src={p.imagen} alt={p.nombre} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px" }} />
                                    )}
                                    <span style={{ fontSize: "0.75rem", color: "#5d405d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>{p.nombre}</span>
                                  </div>
                                ))}
                                {venta.productos.length > 4 && (
                                  <div style={{ fontSize: "0.7rem", alignSelf: "center", color: "#7a6478" }}>+{venta.productos.length - 4}</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#c9a8b8", fontSize: "0.8rem" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        )}

        {/* Gestion de pedidos: quien compro, en que estado esta y cambio de estado (S5/S6) */}
        <AdminPedidos />

        <div className="admin-seccion-gestion" ref={formEdicionRef}>
          <h2 className="admin-titulo-formulario">
            {editandoId ? "Modificar Dulce" : "Nuevo Ingreso"}
          </h2>
          
          <form onSubmit={handleSubmit} className="admin-formulario" noValidate>
            <div className="admin-form-group">
              <label htmlFor="nombre">Nombre del Producto</label>
              <input
                type="text"
                id="nombre"
                value={nuevoProducto.nombre}
                onChange={handleChange}
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="precio">Precio</label>
              <input
                type="number"
                id="precio"
                value={nuevoProducto.precio}
                onChange={handleChange}
              />
            </div>
            <div className="admin-form-group admin-full-width">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                value={nuevoProducto.descripcion}
                onChange={handleChange}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="categoria">Sección en Web</label>
              <select
                id="categoria"
                value={nuevoProducto.categoria}
                onChange={handleChange}
              >
                <option value="">-- Seleccionar Sección --</option>
                <option value="Sabores Frutales">Sabores Frutales</option>
                <option value="Nuestras Tortas">Nuestras Tortas</option>
                <option value="Tentaciones Individuales">Tentaciones Individuales</option>
                <option value="Queques Artesanales">Queques Artesanales</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="imagenUrl">Imagen del Archivo</label>
              <select
                id="imagenUrl"
                value={nuevoProducto.imagenUrl}
                onChange={handleChange}
              >
                <option value="">-- Seleccionar Imagen --</option>
                <option value="alfajor.jpg">alfajor.jpg</option>
                <option value="brownieChocolateNuez.jpg">brownieChocolateNuez.jpg</option>
                <option value="carlotaMango.jpg">carlotaMango.jpg</option>
                <option value="cupcakesVariedades.jpg">cupcakesVariedades.jpg</option>
                <option value="donasGlaseadas.jpg">donasGlaseadas.jpg</option>
                <option value="kutchenDeManzana.jpg">kutchenDeManzana.jpg</option>
                <option value="miniTartaletas.jpg">miniTartaletas.jpg</option>
                <option value="muffinsPlatanoArandano.jpg">muffinsPlatanoArandano.jpg</option>
                <option value="pieDeLimon.jpg">pieDeLimon.jpg</option>
                <option value="pieMaracuya.jpg">pieMaracuya.jpg</option>
                <option value="quequeArandano.jpg">quequeArandano.jpg</option>
                <option value="quequeChoc.jpg">quequeChoc.jpg</option>
                <option value="quequeMarmoladoVainilla.jpg">quequeMarmoladoVainilla.jpg</option>
                <option value="quequePlatano.jpg">quequePlatano.jpg</option>
                <option value="quequeVainilla.jpg">quequeVainilla.jpg</option>
                <option value="rollosDeCanela.jpg">rollosDeCanela.jpg</option>
                <option value="tartaletaFrutas.jpg">tartaletaFrutas.jpg</option>
                <option value="tartaYogurth.jpg">tartaYogurth.jpg</option>
                <option value="torta3Leches.jpg">torta3Leches.jpg</option>
                <option value="tortaCremaPina.jpg">tortaCremaPina.jpg</option>
                <option value="tortaManjarLucuma.jpg">tortaManjarLucuma.jpg</option>
                <option value="tortaManjarNuez.jpg">tortaManjarNuez.jpg</option>
                <option value="tortaMerengueFrambueza.jpg">tortaMerengueFrambueza.jpg</option>
                <option value="tortaMoka.jpg">tortaMoka.jpg</option>
                <option value="tortaSelvaNegra.jpg">tortaSelvaNegra.jpg</option>
              </select>
            </div>

            <div className="admin-botonera">
              <button type="submit" className="admin-btn-principal">
                {editandoId ? "Actualizar" : "Publicar"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={resetearFormulario}
                  className="admin-btn-pill"
                  style={{ backgroundColor: "#666" }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-tabla-container">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Miniatura</th>
                <th>Nombre</th>
                <th>Sección</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    <img
                      src={`/img/${prod.imagenUrl}`}
                      alt=""
                      className="admin-img-tabla"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.src = "/img/alfajor.jpg";
                      }}
                    />
                  </td>
                  <td><strong>{prod.nombre}</strong></td>
                  <td>{prod.categoria}</td>
                  <td>${Number(prod.precio).toLocaleString("es-CL")}</td>
                  <td>
                    <button
                      className="admin-btn-pill"
                      onClick={() => prepararEdicion(prod)}
                      aria-label={`Editar ${prod.nombre}`}
                    >
                      ✏️
                    </button>
                    <button
                      className="admin-btn-pill"
                      style={{ backgroundColor: "#5d405d" }}
                      onClick={() => manejarEliminar(prod.id)}
                      aria-label={`Eliminar ${prod.nombre}`}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;