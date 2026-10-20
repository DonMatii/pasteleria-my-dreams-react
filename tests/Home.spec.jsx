import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import Home from "../src/pages/Home";
import { CarritoProvider, useCarrito } from "../src/context/CarritoContext";
import { obtenerProductos, obtenerDeliciaDelDia } from "../src/service/ProductosService";
import { verificarElegibilidadBienvenida } from "../src/service/BienvenidaService";
import { pedirCantidad } from "../src/utils/pedirCantidad";
import Swal from "sweetalert2";
import '@testing-library/jest-dom';

// El Home ahora lee el catálogo real: nunca pega a la API en los tests
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
  aplanarCatalogo: vi.fn((datos) => Object.values(datos).flat()),
}));

// Solo se mockea la consulta de elegibilidad (red al backend); las funciones
// puras de localStorage (obtener/consumirCodigoBienvenida) siguen reales
vi.mock("../src/service/BienvenidaService", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    verificarElegibilidadBienvenida: vi.fn(),
  };
});

// El modal de cantidad se mockea: el test decide cuantas unidades confirma
vi.mock("../src/utils/pedirCantidad", () => ({
  pedirCantidad: vi.fn(),
}));

// SweetAlert2 se mockea (mismo patrón que Pedido/Contacto/AdminPanel):
// jsdom no lo puede renderizar, así que el test verifica el contrato que
// la página le pasa al toast
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

// Respuesta simulada de GET /api/productos (Map agrupado por categoría)
const catalogoDePrueba = {
  Tortas: [
    { id: 1, nombre: "Selva Negra", precio: 14500, imagenUrl: "tortaSelvaNegra.jpg", descripcion: "Bizcocho de chocolate." },
    { id: 2, nombre: "Manjar Lúcuma", precio: 12000, imagenUrl: "tortaManjarLucuma.jpg", descripcion: "Crema de manjar." },
    { id: 3, nombre: "Tres Leches", precio: 13000, imagenUrl: "torta3Leches.jpg", descripcion: "Húmeda y suave." },
  ],
  Personales: [
    { id: 4, nombre: "Brownie de Nuez", precio: 3500, imagenUrl: "brownieChocolateNuez.jpg", descripcion: "Intenso sabor chocolate." },
    { id: 5, nombre: "Muffin de Arándano", precio: 2500, imagenUrl: "muffinsPlatanoArandano.jpg", descripcion: "Esponjoso y dulce." },
  ],
};

const renderHome = () =>
  render(
    <CarritoProvider>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </CarritoProvider>
  );

// Probe: expone el estado real del carrito compartido para las aserciones
function CarritoProbe() {
  const { items } = useCarrito();
  return (
    <div data-testid="carrito-items">
      {items.map((it) => (
        <span key={it.id}>
          {`${it.nombre} x${it.cantidad}`}
        </span>
      ))}
    </div>
  );
}

const renderHomeConCarrito = () =>
  render(
    <CarritoProvider>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
      <CarritoProbe />
    </CarritoProvider>
  );

describe("Pruebas de la Página Principal (Home)", () => {
  beforeEach(() => {
    // Estado limpio: el banner de bienvenida depende de localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    obtenerProductos.mockResolvedValue(catalogoDePrueba);
    pedirCantidad.mockReset();
    Swal.fire.mockClear();
    // Por defecto el endpoint de la delicia falla: la home debe caer al
    // sorteo aleatorio local sin badge de descuento
    obtenerDeliciaDelDia.mockReset();
    obtenerDeliciaDelDia.mockRejectedValue(new Error("sin delicia del día"));
    // Por defecto el backend confirma la elegibilidad del código de bienvenida
    verificarElegibilidadBienvenida.mockReset();
    verificarElegibilidadBienvenida.mockResolvedValue(true);
  });

  it("debe renderizar el título principal y el eslogan", () => {
    renderHome();

    expect(screen.getByText(/Bienvenido a Pastelería My Dreams/i)).toBeInTheDocument();
    expect(screen.getByText(/sabores que iluminan tus sueños/i)).toBeInTheDocument();
  });

  it("debe mostrar la delicia del día con su precio y botón de alta", async () => {
    renderHome();

    const seccion = await screen.findByTestId("delicia-dia");
    expect(seccion).toBeInTheDocument();
    // El botón abre el modal de cantidad y da de alta en el carrito
    // (acotado a la sección: los favoritos ahora también tienen su botón)
    expect(within(seccion).getByRole("button", { name: /Agregar al carrito/i })).toBeInTheDocument();
  });

  it("debe mostrar 3 favoritos distintos de la delicia del día", async () => {
    renderHome();

    // 1 delicia + 3 favoritos = 4 tarjetas con producto
    const titulos = await screen.findAllByRole("heading", { level: 3 });
    expect(titulos).toHaveLength(4);

    // Ningún producto se repite entre delicia y favoritos
    const nombres = titulos.map((t) => t.textContent);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("muestra la delicia real del día con badge -10% cuando el endpoint responde", async () => {
    // La delicia del día la decide el backend (mismo shape que el catálogo)
    obtenerDeliciaDelDia.mockResolvedValue({
      id: 4,
      nombre: "Brownie de Nuez",
      precio: 3500,
      imagenUrl: "brownieChocolateNuez.jpg",
      descripcion: "Intenso sabor a chocolate.",
    });

    renderHome();

    // El badge de descuento solo existe cuando el backend confirmó la delicia
    const badge = await screen.findByTestId("badge-delicia");
    expect(badge).toHaveTextContent(/-10% hoy/);

    // La tarjeta de la delicia muestra el producto que vino del endpoint
    const seccion = await screen.findByTestId("delicia-dia");
    expect(
      within(seccion).getByRole("heading", { level: 3, name: "Brownie de Nuez" })
    ).toBeInTheDocument();

    // El copy de la sección refleja la regla real del descuento
    expect(within(seccion).getByText(/La especialidad de hoy/i)).toBeInTheDocument();
  });

  it("la delicia del endpoint nunca aparece entre los favoritos de la casa", async () => {
    obtenerDeliciaDelDia.mockResolvedValue({
      id: 4,
      nombre: "Brownie de Nuez",
      precio: 3500,
      imagenUrl: "brownieChocolateNuez.jpg",
      descripcion: "Intenso sabor a chocolate.",
    });

    renderHome();

    const favoritos = await screen.findByTestId("favoritos-casa");
    // 3 favoritos, todos distintos de la delicia (excluida por id)
    expect(within(favoritos).getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(within(favoritos).queryByText("Brownie de Nuez")).not.toBeInTheDocument();
    // La delicia igual tiene su propia tarjeta
    expect(await screen.findByTestId("delicia-dia")).toBeInTheDocument();
  });

  it("sin badge y con selección aleatoria si el endpoint de la delicia falla", async () => {
    obtenerDeliciaDelDia.mockRejectedValue(new Error("404"));

    renderHome();

    expect(await screen.findByTestId("delicia-dia")).toBeInTheDocument();
    // Nunca se promete un descuento que el backend no confirmó
    expect(screen.queryByTestId("badge-delicia")).not.toBeInTheDocument();
    // Fallback visible: 1 delicia + 3 favoritos
    const titulos = await screen.findAllByRole("heading", { level: 3 });
    expect(titulos).toHaveLength(4);
    // El copy sigue siendo honesto: sorteo aleatorio del catálogo local
    expect(
      screen.getByText(/Elegida al azar entre todas nuestras creaciones/i)
    ).toBeInTheDocument();
  });

  it("permite agregar un favorito de la casa al carrito con el selector de cantidad", async () => {
    pedirCantidad.mockResolvedValue(2);

    renderHomeConCarrito();

    const seccion = await screen.findByTestId("favoritos-casa");
    const botones = within(seccion).getAllByRole("button", {
      name: /Agregar al carrito/i,
    });
    expect(botones).toHaveLength(3);

    // Cada tarjeta lleva su propio producto: el título es el h3 de la misma tarjeta
    const primeraTarjeta = botones[0].closest(".producto");
    const nombreFavorito = within(primeraTarjeta).getByRole("heading").textContent;

    fireEvent.click(botones[0]);

    // El modal devolvió 2 unidades: el carrito recibe el alta con ese producto
    expect(pedirCantidad).toHaveBeenCalledTimes(1);
    expect(pedirCantidad).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: nombreFavorito })
    );
    await waitFor(() =>
      expect(screen.getByTestId("carrito-items")).toHaveTextContent(
        `${nombreFavorito} x2`
      )
    );
    // El aviso ahora es el toast compacto (mismo SweetAlert2 de la compra)
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(Swal.fire.mock.calls[0][0]).toMatchObject({
      toast: true,
      title: expect.stringContaining(nombreFavorito),
      html: expect.stringContaining("/img/"),
    });
  });

  it("el toast de carrito sale arriba con la foto del producto y 3 segundos de vida", async () => {
    pedirCantidad.mockResolvedValue(1);

    renderHomeConCarrito();

    const seccion = await screen.findByTestId("favoritos-casa");
    fireEvent.click(
      within(seccion).getAllByRole("button", { name: /Agregar al carrito/i })[0]
    );

    // Contrato del toast: arriba, con foto del producto vía html, X de
    // cierre manual, sin botón de confirmación y cierre a los 3 segundos
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(Swal.fire.mock.calls[0][0]).toMatchObject({
      toast: true,
      position: "top",
      timer: 3000,
      showCloseButton: true,
      showConfirmButton: false,
      title: expect.stringMatching(/<span class="toast-carrito-nombre">.*<\/span> agregado al carrito/i),
      html: expect.stringContaining("/img/"),
      customClass: { popup: "toast-carrito" },
    });
  });

  it("debe mostrar los nombres y precios con formato chileno", async () => {
    renderHome();

    await screen.findByTestId("delicia-dia");
    expect(screen.getAllByText(/\$[\d.]+/).length).toBeGreaterThanOrEqual(4);
  });

  it("usa los productos de respaldo si la API no responde", async () => {
    obtenerProductos.mockRejectedValue(new Error("sin conexión"));

    renderHome();

    // El fallback evita que la home quede vacía
    expect(await screen.findByText(/Kutchen de Manzana/i)).toBeInTheDocument();
  });

  it("debe tener un único botón que redirige al catálogo, el del hero", () => {
    renderHome();

    // Cathi: un solo CTA al catálogo (no duplicar "Ver delicias" + "Ver catálogo")
    const enlacesCatalogo = screen
      .getAllByRole("link")
      .filter((enlace) => enlace.getAttribute("href") === "/delicias");
    expect(enlacesCatalogo).toHaveLength(1);
    expect(enlacesCatalogo[0]).toHaveTextContent(/Ver nuestras delicias/i);
  });

  it("muestra el banner de bienvenida solo con código pendiente, sesión activa y elegibilidad confirmada", async () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");
    sessionStorage.setItem("userName", "Catherine");
    sessionStorage.setItem("userEmail", "catherine@ejemplo.cl");
    verificarElegibilidadBienvenida.mockResolvedValue(true);

    renderHome();

    const banner = await screen.findByTestId("banner-bienvenida");
    expect(banner).toBeInTheDocument();
    expect(screen.getByTestId("codigo-bienvenida-home")).toHaveTextContent("BIENVENIDO10");
    expect(screen.getByRole("link", { name: /Usar mi descuento/i })).toHaveAttribute(
      "href",
      "/pedido"
    );
    // El backend confirma elegibilidad con el email de la sesión
    expect(verificarElegibilidadBienvenida).toHaveBeenCalledWith("catherine@ejemplo.cl");
  });

  it("no muestra el banner si el backend dice que el email ya canjeó el código", async () => {
    // El navegador tiene el código (primera conexión local), pero el backend es
    // la autoridad: ese email ya canjeó, así que no se vuelve a prometer
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");
    sessionStorage.setItem("userName", "Repetidora");
    sessionStorage.setItem("userEmail", "repetidora@ejemplo.cl");
    verificarElegibilidadBienvenida.mockResolvedValue(false);

    renderHome();

    await waitFor(() =>
      expect(verificarElegibilidadBienvenida).toHaveBeenCalledWith("repetidora@ejemplo.cl")
    );
    expect(screen.queryByTestId("banner-bienvenida")).not.toBeInTheDocument();
    // El código trampa se consume: /pedido tampoco lo va a prellenar
    await waitFor(() =>
      expect(localStorage.getItem("md_codigo_bienvenida")).toBeNull()
    );
  });

  it("no muestra el banner si el backend no responde (sin confirmación no se promete)", async () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");
    sessionStorage.setItem("userName", "Sin Backend");
    sessionStorage.setItem("userEmail", "sinbackend@ejemplo.cl");
    verificarElegibilidadBienvenida.mockRejectedValue(new Error("503"));

    renderHome();

    await waitFor(() =>
      expect(verificarElegibilidadBienvenida).toHaveBeenCalled()
    );
    expect(screen.queryByTestId("banner-bienvenida")).not.toBeInTheDocument();
  });

  it("no muestra el banner sin sesión de cliente", () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    renderHome();

    expect(screen.queryByTestId("banner-bienvenida")).not.toBeInTheDocument();
  });
});
