import React, { useEffect, useMemo, useRef, useState } from "react";
import { obtenerProductos, crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto } from "../service/ProductosService";
import { resolverUrlImagen } from "../utils/resolverUrlImagen";
import { obtenerEstadisticas, guardarMetas, obtenerProductosVistos } from "../service/EstadisticasService";
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
  // Estado de la carga del catálogo: "cargando" | "ok" | "error". Una tabla
  // vacía por un servicio caido se lee como "no hay productos", así que el
  // panel tiene que decir que no pudo leerla (P0-3)
  const [estadoProductos, setEstadoProductos] = useState("cargando");
  const [editandoId, setEditandoId] = useState(null);
  const [stats, setStats] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  // El detalle por día de la tabla de 7 días sale de pedidos-service: si ese
  // servicio falla la sección lo dice en vez de afirmar "Sin detalle"
  const [estadoPedidosDiario, setEstadoPedidosDiario] = useState("cargando");
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    imagenUrl: "",
    categoria: "",
    activo: true,
  });

  // Foto del producto: al elegir el archivo se sube solo y se muestra la
  // vista previa (S1-S3); la URL devuelta viaja en nuevoProducto.imagenUrl
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const inputImagenRef = useRef(null);

  // Dashboard: periodo elegido, ventas por producto del periodo y edicion de la meta
  const [periodo, setPeriodo] = useState("dia");
  const [ventasPorProducto, setVentasPorProducto] = useState([]);
  // Estado explicito de cada fuente: el panel avisa en vez de quedarse mudo (P0-3)
  const [estadoStats, setEstadoStats] = useState("cargando");
  const [estadoVentasProducto, setEstadoVentasProducto] = useState("cargando");
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaEnEdicion, setMetaEnEdicion] = useState("");

  // Orden de "Que se vendio" y de la tabla de 7 dias, y estado plegado de cada seccion
  const [ordenVendidos, setOrdenVendidos] = useState({ campo: "unidades", dir: "desc" });
  const [ordenDiario, setOrdenDiario] = useState({ campo: "fecha", dir: "desc" });
  const [vendidosAbiertos, setVendidosAbiertos] = useState(true);
  const [diarioAbierto, setDiarioAbierto] = useState(true);
  const [topAbierto, setTopAbierto] = useState(true);

  // Días de "Ventas de los últimos 7 días": sus productos arrancan plegados
  // para que la sección no empuje el resto de la página hacia abajo
  const [diasProductosAbiertos, setDiasProductosAbiertos] = useState({});

  // "Productos más vistos": la cara visible del stream de Kinesis (Entrega 3).
  // Estado explícito por fuente, como el resto del panel (P0-3)
  const [productosVistos, setProductosVistos] = useState([]);
  const [estadoVistos, setEstadoVistos] = useState("cargando");
  const [vistosAbiertos, setVistosAbiertos] = useState(true);
  // Top compacto para el panel: 5 de entrada y "Ver más" cuando hacen falta
  const [vistosExpandido, setVistosExpandido] = useState(false);
  const VISIBLES_VISTOS = 5;

  // Zona visible del panel (Resumen | Pedidos | Productos): cada bloque vive en
  // su lugar y se navega con las pestañas, en vez de una sola columna infinita
  const [zonaPanel, setZonaPanel] = useState("resumen");

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
      setEstadoProductos("ok");
    }).catch(error => {
      console.error("Error al cargar los datos del catálogo:", error);
      // Sin datos no hay nada que pintar: se limpia la lista para que un
      // reintento no muestre productos viejos como si fueran los nuevos
      setProductos([]);
      setEstadoProductos("error");
    });
  };

  // Sin setState sincrónico en el cuerpo: el efecto de montaje la llama y el relleno
  // ocurre recién cuando la promesa resuelve. El estado de carga lo pinta quien reintenta
  // "Productos más vistos": llega del stream de Kinesis vía estadisticas-service
  const cargarVistos = async () => {
    setEstadoVistos("cargando");
    try {
      const datos = await obtenerProductosVistos();
      setProductosVistos(Array.isArray(datos) ? datos : []);
      setEstadoVistos("ok");
    } catch (error) {
      setProductosVistos([]);
      setEstadoVistos("error");
    }
  };

  useEffect(() => {
    cargarVistos();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const data = await obtenerEstadisticas();
      setStats(data);
      setEstadoStats("ok");
    } catch (error) {
      console.error("Error al conectar con estadisticas-service:", error);
      // Sin datos no hay nada que pintar: se limpia el estado anterior para que un
      // reintento no muestre cifras viejas como si fueran las nuevas
      setStats(null);
      setEstadoStats("error");
    }
  };

  const reintentarEstadisticas = () => {
    setEstadoStats("cargando");
    cargarEstadisticas();
  };

  const cargarPedidos = async () => {
    try {
      const data = await obtenerPedidos();
      setPedidos(Array.isArray(data) ? data : []);
      setEstadoPedidosDiario("ok");
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      setPedidos([]);
      setEstadoPedidosDiario("error");
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

  // Pide a pedidos-service que se vendio en el rango del periodo elegido. Si ese
  // servicio falla la seccion lo dice: "Sin ventas registradas" seria mentir.
  // El estado inicial "cargando" cubre la primera carga; al cambiar de periodo la
  // seccion conserva el dato anterior hasta que llega el nuevo (el fallo se avisa igual)
  useEffect(() => {
    const rango = stats?.ventasPeriodo?.[periodo];
    if (!rango?.desde || !rango?.hasta) return;
    let vigente = true;
    obtenerVentasPorProducto(rango.desde, rango.hasta)
      .then((lista) => {
        if (!vigente) return;
        setVentasPorProducto(lista);
        setEstadoVentasProducto("ok");
      })
      .catch((error) => {
        console.error("Error al conectar con pedidos-service:", error);
        if (!vigente) return;
        setVentasPorProducto([]);
        setEstadoVentasProducto("error");
      });
    return () => {
      vigente = false;
    };
  }, [stats, periodo]);

  // El backend avisa con datosCompletos cuando un bloque falló y respondió con ceros:
  // ese cero no se leyó de la base, así que no es "no se vendió nada" (P0-3)
  const datosIncompletos = stats?.datosCompletos === false;

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

  // Monto total de lo vendido en el periodo: base del "% del total"
  const montoTotalVendido = useMemo(
    () => ventasPorProducto.reduce((suma, v) => suma + (Number(v.monto) || 0), 0),
    [ventasPorProducto]
  );

  // Participacion de un monto en ese total, redondeada al entero
  const porcentajeDelTotal = (monto) =>
    montoTotalVendido > 0 ? Math.round(((Number(monto) || 0) / montoTotalVendido) * 100) : 0;

  // La tabla de 7 dias con el orden elegido (por defecto, de mas reciente a mas antiguo)
  const diarioOrdenado = useMemo(() => {
    if (!Array.isArray(stats?.ventasDiarias)) return [];
    // Agrupar productos por fecha usando los pedidos cargados
    const productosPorFecha = new Map();
    (pedidos || []).forEach(p => {
      const fecha = new Date(p.fecha).toISOString().slice(0,10);
      if (!productosPorFecha.has(fecha)) productosPorFecha.set(fecha, []);
      (p.productos || []).forEach(prod => {
        const img = imagenDe(prod.nombre);
        productosPorFecha.get(fecha).push({
          nombre: prod.nombre,
          imagen: resolverUrlImagen(img),
          cantidad: Number(prod.cantidad) || 0,
          monto: Number(prod.subtotal) || 0
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
          mapa.get(key).monto += p.monto;
        } else {
          mapa.set(key, { ...p });
        }
      });
      return { ...v, productos: Array.from(mapa.values()) };
    });
    const { campo, dir } = ordenDiario;
    arr.sort((a, b) => {
      let cmp = 0;
      if (campo === "fecha") {
        cmp = String(a.fecha).localeCompare(String(b.fecha));
      } else if (campo === "productos") {
        cmp = (a.productos?.length || 0) - (b.productos?.length || 0);
      } else {
        cmp = (Number(a[campo]) || 0) - (Number(b[campo]) || 0);
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [stats?.ventasDiarias, ordenDiario, pedidos, productos]);

  // El dia mas fuerte de la ventana: escala de las barras proporcionales
  const maxMontoDiario = useMemo(
    () => Math.max(0, ...diarioOrdenado.map((d) => Number(d.monto) || 0)),
    [diarioOrdenado]
  );

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

  // Elige la foto y la sube de inmediato: la URL que responde el catalogo
  // queda lista para el create/PUT, sin tecnicismos en pantalla
  const manejarArchivoImagen = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoImagen(true);
    setErrorImagen("");
    try {
      const url = await subirImagenProducto(archivo);
      setNuevoProducto((prev) => ({ ...prev, imagenUrl: url }));
    } catch {
      setErrorImagen("No se pudo subir la imagen. Intenta nuevamente.");
    } finally {
      setSubiendoImagen(false);
    }
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
    // El formulario vive en la zona Productos: se abre antes del scroll para
    // que la referencia exista cuando el efecto intente llevarse hasta ella
    setZonaPanel("productos");
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
    // El input de archivo no se controla con valor: se limpia a mano para que
    // el proximo producto no muestre la foto anterior
    if (inputImagenRef.current) inputImagenRef.current.value = "";
    setSubiendoImagen(false);
    setErrorImagen("");
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

        {/* Navegación del panel: cada cosa en su zona, a un click de distancia
            (antes todo era una sola columna que no terminaba nunca) */}
        <nav className="admin-zonas" role="tablist" aria-label="Secciones del panel">
          {[
            { id: "resumen", etiqueta: "Resumen" },
            { id: "pedidos", etiqueta: "Pedidos" },
            { id: "productos", etiqueta: "Productos" },
          ].map((z) => (
            <button
              key={z.id}
              type="button"
              role="tab"
              aria-selected={zonaPanel === z.id}
              className={`admin-zona-btn${zonaPanel === z.id ? " admin-zona-activo" : ""}`}
              onClick={() => setZonaPanel(z.id)}
            >
              {z.etiqueta}
            </button>
          ))}
        </nav>

        <div
          className="admin-zona"
          hidden={zonaPanel !== "resumen"}
          style={{ display: zonaPanel !== "resumen" ? "none" : undefined }}
        >
        {/* Dashboard de ventas: periodo, KPIs, avance a meta y productos vendidos.
            Tres estados explícitos: cargando, error con reintento y datos reales.
            El panel nunca se queda mudo ni pinta cifras que no se leyeron (P0-3) */}
        {estadoStats === "cargando" && (
          <section
            className="admin-dashboard"
            aria-label="Dashboard de ventas"
            data-testid="dashboard-cargando"
          >
            <div className="admin-dashboard-cabecera">
              <h2 className="admin-dashboard-titulo">Resumen de ventas</h2>
            </div>
            <p className="admin-dashboard-estado">Cargando ventas…</p>
          </section>
        )}

        {estadoStats === "error" && (
          <section
            className="admin-dashboard"
            aria-label="Dashboard de ventas"
            data-testid="dashboard-error"
          >
            <div className="admin-dashboard-cabecera">
              <h2 className="admin-dashboard-titulo">Resumen de ventas</h2>
            </div>
            <p className="admin-dashboard-estado">
              No se pudieron cargar las estadísticas: estadisticas-service no respondió.
            </p>
            <button type="button" className="admin-reintentar" onClick={reintentarEstadisticas}>
              Reintentar
            </button>
          </section>
        )}

        {estadoStats === "ok" && stats && (
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

            {/* Aviso de datos incompletos: el servicio respondió, pero algún bloque
                falló y devolvió ceros. No es "no se vendió nada", es "no se leyó" */}
            {datosIncompletos && (
              <p className="admin-datos-incompletos" data-testid="aviso-datos-incompletos">
                ⚠️ Estadísticas incompletas: estadisticas-service está degradado y parte de los
                datos no se pudo leer. Reintenta antes de tomar una decisión con estas cifras.
              </p>
            )}

            {/* Primero las cifras del periodo elegido, luego los totales del catalogo */}
            <div data-testid="kpis-dashboard">
              {/* Cifras del periodo elegido: cambian con Día/Semana/Mes */}
              <div className="admin-kpis admin-kpis-periodo">
                <div className="admin-kpi admin-kpi-destacado">
                  <span className="admin-kpi-etiqueta">Ventas {periodoActual.frase}</span>
                  <strong className="admin-kpi-valor">
                    {datosIncompletos ? "—" : `$${formatearMoneda(ventasPeriodoSel.monto)}`}
                  </strong>
                </div>
                <div className="admin-kpi admin-kpi-destacado">
                  <span className="admin-kpi-etiqueta">Pedidos {periodoActual.frase}</span>
                  <strong className="admin-kpi-valor">
                    {datosIncompletos ? "—" : (ventasPeriodoSel.pedidos ?? 0)}
                  </strong>
                </div>
              </div>

              {/* Totales del negocio: no cambian con el selector de periodo y
                  por eso se agrupan aparte (antes se leían como si fueran
                  cifras del periodo elegido) */}
              <div className="admin-kpis-totales">
                <span className="admin-kpis-totales-titulo">Totales del negocio</span>
                <div className="admin-kpis admin-kpis-secundarias">
                  <div className="admin-kpi">
                    <span className="admin-kpi-etiqueta">Ventas totales</span>
                    <strong className="admin-kpi-valor">
                      {datosIncompletos ? "—" : `$${formatearMoneda(stats.montoTotalPedidos)}`}
                    </strong>
                  </div>
                  <div className="admin-kpi">
                    <span className="admin-kpi-etiqueta">Pedidos totales</span>
                    <strong className="admin-kpi-valor">
                      {datosIncompletos ? "—" : (stats.pedidosTotales ?? 0)}
                    </strong>
                  </div>
                  <div className="admin-kpi">
                    <span className="admin-kpi-etiqueta">Total catálogo</span>
                    <strong className="admin-kpi-valor">
                      {datosIncompletos ? "—" : (stats.totalProductosCatalogo ?? 0)}
                    </strong>
                  </div>
                  <div className="admin-kpi">
                    <span className="admin-kpi-etiqueta">Categorías</span>
                    <strong className="admin-kpi-valor">
                      {datosIncompletos ? "—" : (stats.categoriasActivas ?? 0)}
                    </strong>
                  </div>
                </div>
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
              ) : datosIncompletos ? (
                <p className="admin-meta-vacia" data-testid="meta-sin-datos">
                  No se pudieron leer las ventas de {periodoActual.frase.toLowerCase()}: sin dato
                  real no hay avance que mostrar hacia la meta.
                </p>
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
                  <h3 className="admin-top-titulo">Más vendidos ({periodoActual.frase.toLowerCase()})</h3>
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
                          src={resolverUrlImagen(imagenDe(venta.nombre))}
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
                        <div className="admin-top-monto-caja">
                          <span className="admin-top-monto">${formatearMoneda(venta.monto)}</span>
                          <span className="admin-top-porcentaje">
                            {porcentajeDelTotal(venta.monto)}% del total
                          </span>
                        </div>
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
                  estadoVentasProducto === "error" ? (
                    <p className="admin-vendidos-vacio" data-testid="vendidos-sin-datos">
                      No se pudieron leer las ventas de pedidos-service. Revisa el servicio y
                      vuelve a intentar.
                    </p>
                  ) : estadoVentasProducto === "cargando" ? (
                    <p className="admin-vendidos-vacio">Cargando ventas…</p>
                  ) : (
                    <p className="admin-vendidos-vacio">
                      Sin ventas registradas en {periodoActual.frase.toLowerCase()}.
                    </p>
                  )
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
                    {/* Cabecera con las mismas columnas que las filas: alinea
                        los títulos exactamente sobre sus valores */}
                    <div
                      className="admin-vendidos-cabecera"
                      data-testid="cabecera-vendidos"
                      aria-hidden="true"
                    >
                      <span>Producto</span>
                      <span>Unidades</span>
                      <span>Valor</span>
                      <span>% del total</span>
                    </div>
                    <ul className="admin-vendidos-lista" data-testid="lista-vendidos">
                      {vendidosOrdenados.map((venta) => (
                        <li key={venta.nombre} className="admin-vendido">
                          <img
                            src={resolverUrlImagen(imagenDe(venta.nombre))}
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
                          <span className="admin-vendido-porcentaje">
                            {porcentajeDelTotal(venta.monto)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ))}
            </div>

            {/* Lo más vistos: la cara visible del stream de Kinesis (Entrega 3).
                Cada foto que entra en pantalla suma una vista, y aquí se ve el
                top — lo que más llama la atención de los clientes */}
            <div className="admin-diario">
              <div className="admin-seccion-cabecera">
                <h3 className="admin-diario-titulo">Productos más vistos</h3>
                <button
                  type="button"
                  className="admin-pliegue-btn"
                  aria-label="Productos más vistos"
                  aria-expanded={vistosAbiertos}
                  onClick={() => setVistosAbiertos((v) => !v)}
                >
                  {vistosAbiertos ? "Cerrar" : "Abrir"}
                </button>
              </div>
              {vistosAbiertos &&
                (estadoVistos === "error" ? (
                  <p className="admin-dia-nota">
                    No se pudieron leer las vistas de productos.
                  </p>
                ) : estadoVistos === "cargando" ? (
                  <p className="admin-dia-nota">Cargando…</p>
                ) : productosVistos.length === 0 ? (
                  <p className="admin-dia-nota">
                    Todavía no hay vistas registradas: aparecen a medida que los
                    clientes miran los productos.
                  </p>
                ) : (
                  <>
                    <ul className="admin-vendidos-lista">
                      {(vistosExpandido
                        ? productosVistos
                        : productosVistos.slice(0, VISIBLES_VISTOS)
                      ).map((vista) => {
                        const prod = productos.find((p) => p.id === vista.producto_id);
                        const totalVistas = productosVistos.reduce(
                          (suma, v) => suma + (Number(v.vistas) || 0),
                          0
                        );
                        const porcentaje =
                          totalVistas > 0
                            ? Math.round(((Number(vista.vistas) || 0) / totalVistas) * 100)
                            : 0;
                        return (
                          <li key={vista.producto_id} className="admin-vendido">
                            {prod ? (
                              <img
                                src={resolverUrlImagen(prod.imagenUrl)}
                                alt=""
                                className="admin-vendido-img"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.target.src = "/img/alfajor.jpg";
                                }}
                              />
                            ) : (
                              <span className="admin-vendido-img" aria-hidden="true" />
                            )}
                            <span className="admin-vendido-nombre">
                              {prod ? prod.nombre : `Producto #${vista.producto_id}`}
                            </span>
                            <span className="admin-vendido-unidades">
                              {vista.vistas} {Number(vista.vistas) === 1 ? "vista" : "vistas"}
                            </span>
                            {/* El % se muestra con el estilo del monto: es el
                                número que decide la vitrina */}
                            <span className="admin-vendido-monto">{porcentaje}%</span>
                          </li>
                        );
                      })}
                    </ul>
                    {productosVistos.length > VISIBLES_VISTOS && (
                      <button
                        type="button"
                        className="admin-dia-toggle"
                        onClick={() => setVistosExpandido((v) => !v)}
                      >
                        {vistosExpandido
                          ? "Ver menos"
                          : `Ver los ${productosVistos.length}`}
                      </button>
                    )}
                  </>
                ))}
            </div>

            {/* Ventas de los últimos 7 días: tarjetas por día, ordenables y plegables.
                Con la base caída la ventana llega en ceros y "Sin ventas registradas"
                sería una mentira, así que el panel dice que no pudo leerla */}
            {datosIncompletos ? (
              <div className="admin-diario" data-testid="diario-sin-datos">
                <div className="admin-seccion-cabecera">
                  <h3 className="admin-diario-titulo">Ventas de los últimos 7 días</h3>
                </div>
                <p className="admin-diario-vacio">
                  No se pudieron leer las ventas de los últimos 7 días.
                </p>
              </div>
            ) : Array.isArray(stats?.ventasDiarias) && stats.ventasDiarias.length > 0 && (
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
                  <>
                  <div className="admin-orden" role="group" aria-label="Ordenar ventas de los últimos 7 días">
                    <span className="admin-orden-etiqueta">Ordenar por:</span>
                    {[
                      { campo: "fecha", etiqueta: "Fecha" },
                      { campo: "pedidos", etiqueta: "Pedidos" },
                      { campo: "monto", etiqueta: "Monto" },
                      { campo: "productos", etiqueta: "Productos" },
                    ].map((c) => (
                      <button
                        key={c.campo}
                        type="button"
                        className={`admin-orden-btn${
                          ordenDiario.campo === c.campo ? " admin-orden-activo" : ""
                        }`}
                        aria-pressed={ordenDiario.campo === c.campo}
                        onClick={() => cambiarOrdenDiario(c.campo)}
                      >
                        {c.etiqueta}
                        {ordenDiario.campo === c.campo &&
                          (ordenDiario.dir === "asc" ? " ↑" : " ↓")}
                      </button>
                    ))}
                  </div>
                  <div className="admin-diario-lista" data-testid="lista-dias">
                    {diarioOrdenado.map((venta) => {
                      const sinVentas = !(venta.pedidos > 0 || venta.monto > 0);
                      return (
                        <article
                          key={venta.fecha}
                          className={`admin-dia${sinVentas ? " admin-dia-vacio" : ""}`}
                        >
                          <div className="admin-dia-cabecera">
                            <span className="admin-dia-fecha">{formatearFecha(venta.fecha)}</span>
                            {sinVentas ? (
                              <span className="admin-dia-nota">Sin ventas registradas</span>
                            ) : (
                              <>
                                <span className="admin-dia-pedidos">
                                  {venta.pedidos} {venta.pedidos === 1 ? "pedido" : "pedidos"}
                                </span>
                                <span className="admin-dia-monto">
                                  ${formatearMoneda(venta.monto)}
                                </span>
                              </>
                            )}
                          </div>
                          {/* Barra contra el dia mas fuerte de la ventana:
                              el dia mas vendido se ve de un vistazo, sin leer numeros */}
                          {!sinVentas && maxMontoDiario > 0 && (
                            <div className="admin-dia-barra" aria-hidden="true">
                              <span
                                className="admin-dia-barra-relleno"
                                data-testid="dia-barra"
                                style={{
                                  width: `${Math.round((venta.monto / maxMontoDiario) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                          {/* Detalle por día: sale de pedidos-service y arranca
                              plegado para que la sección no empuje todo hacia
                              abajo. Si ese servicio falló el aviso se ve igual,
                              sin desplegar: nunca se afirma "Sin detalle" */}
                          {!sinVentas &&
                            (estadoPedidosDiario === "error" ? (
                              <p
                                className="admin-dia-nota"
                                data-testid="diario-detalle-error"
                              >
                                No se pudo leer el detalle de productos de pedidos-service.
                              </p>
                            ) : venta.productos.length > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-dia-toggle"
                                  aria-expanded={!!diasProductosAbiertos[venta.fecha]}
                                  onClick={() =>
                                    setDiasProductosAbiertos((prev) => ({
                                      ...prev,
                                      [venta.fecha]: !prev[venta.fecha],
                                    }))
                                  }
                                >
                                  {diasProductosAbiertos[venta.fecha]
                                    ? "Ocultar productos"
                                    : `Ver productos (${venta.productos.length})`}
                                </button>
                                {diasProductosAbiertos[venta.fecha] && (
                                  <ul className="admin-vendidos-lista">
                                    {venta.productos.map((p) => (
                                      <li key={p.nombre} className="admin-vendido">
                                        <img
                                          src={resolverUrlImagen(imagenDe(p.nombre))}
                                          alt={p.nombre}
                                          className="admin-vendido-img"
                                          loading="lazy"
                                          decoding="async"
                                          onError={(e) => {
                                            e.target.src = "/img/alfajor.jpg";
                                          }}
                                        />
                                        <span className="admin-vendido-nombre">{p.nombre}</span>
                                        <span className="admin-vendido-unidades">
                                          {p.cantidad} {p.cantidad === 1 ? "unidad" : "unidades"}
                                        </span>
                                        <span className="admin-vendido-monto">
                                          ${formatearMoneda(p.monto)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <p className="admin-dia-nota">Sin detalle de productos</p>
                            ))}
                        </article>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* Gestion de pedidos: quien compro, en que estado esta y cambio de estado (S5/S6) */}
        </div>

        {/* Zona Pedidos: la gestión de pedidos, intacta */}
        <div
          className="admin-zona"
          hidden={zonaPanel !== "pedidos"}
          style={{ display: zonaPanel !== "pedidos" ? "none" : undefined }}
        >
          <AdminPedidos />
        </div>

        <div
          className="admin-zona"
          hidden={zonaPanel !== "productos"}
          style={{ display: zonaPanel !== "productos" ? "none" : undefined }}
        >
        <div className="admin-seccion-gestion" ref={formEdicionRef}>
          <h2 className="admin-titulo-formulario">
            {editandoId ? `Modificar Dulce: ${nuevoProducto.nombre}` : "Nuevo Ingreso"}
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
              <label htmlFor="archivoImagen">Foto del producto</label>
              <div className="admin-foto-fila">
                <input
                  type="file"
                  id="archivoImagen"
                  ref={inputImagenRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={manejarArchivoImagen}
                  className="admin-foto-input"
                />
                {/* El input nativo se oculta: el disparador es la pastilla
                    institucional y el estado al lado dice que pasa, en criollo */}
                <label htmlFor="archivoImagen" className="admin-foto-boton">
                  {nuevoProducto.imagenUrl ? "Cambiar foto" : "Elegir foto"}
                </label>
                <span className="admin-foto-estado">
                  {subiendoImagen
                    ? "Subiendo la foto…"
                    : nuevoProducto.imagenUrl
                      ? "Foto lista ✓"
                      : "Ninguna foto todavía — JPG, PNG o WebP hasta 5 MB"}
                </span>
              </div>
              {errorImagen && <p className="admin-form-error">{errorImagen}</p>}
              {nuevoProducto.imagenUrl && (
                <img
                  className="admin-form-preview"
                  src={resolverUrlImagen(nuevoProducto.imagenUrl)}
                  alt="Vista previa de la foto del producto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/img/alfajor.jpg";
                  }}
                />
              )}
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

        {/* Tabla del catálogo: si catalogo-service no responde se dice en vez
            de dejar la tabla vacía, que se leería como "no hay productos" */}
        {estadoProductos === "error" ? (
          <div className="admin-productos-error" data-testid="productos-error">
            <p className="admin-pedidos-vacio">
              No se pudo leer el catálogo: catalogo-service no respondió.
            </p>
            <button
              type="button"
              className="admin-reintentar"
              data-testid="productos-reintentar"
              onClick={cargarDatos}
            >
              Reintentar
            </button>
          </div>
        ) : (
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
                      src={resolverUrlImagen(prod.imagenUrl)}
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
                      Editar
                    </button>
                    <button
                      className="admin-btn-pill"
                      style={{ backgroundColor: "#5d405d" }}
                      onClick={() => manejarEliminar(prod.id)}
                      aria-label={`Eliminar ${prod.nombre}`}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;