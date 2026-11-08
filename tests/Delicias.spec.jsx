import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import React from "react";
import Delicias from "../src/pages/Delicias";
import { CarritoProvider } from "../src/context/CarritoContext";
import * as ProductosService from "../src/service/ProductosService";
import { pedirCantidad } from "../src/utils/pedirCantidad";
import Swal from "sweetalert2";
import "@testing-library/jest-dom";

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

// Se mantiene aplanarCatalogo real; solo se mockean las llamadas HTTP.
vi.mock("../src/service/ProductosService", async (importOriginal) => {
  const modulo = await importOriginal();
  return {
    ...modulo,
    obtenerProductos: vi.fn(),
    obtenerDeliciaDelDia: vi.fn(),
  };
});

const CATALOGO = {
  tortas: [
    {
      id: 1,
      nombre: "Torta Moka",
      categoria: "tortas",
      precio: 15000,
      imagenUrl: "tortaMoka.jpg",
      descripcion: "Torta de moka",
    },
    {
      id: 2,
      nombre: "Torta Frutilla",
      categoria: "tortas",
      precio: 14000,
      imagenUrl: "tortaFrutilla.jpg",
      descripcion: "Torta de frutilla",
    },
  ],
};

describe("Delicias - badge de la delicia del día", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductosService.obtenerProductos.mockResolvedValue(CATALOGO);
  });

  const montar = () =>
    render(
      <CarritoProvider>
        <Delicias />
      </CarritoProvider>
    );

  test("muestra el badge -10% solo en la tarjeta de la delicia del día", async () => {
    ProductosService.obtenerDeliciaDelDia.mockResolvedValue(CATALOGO.tortas[0]);

    montar();

    const tarjetaDelicia = await screen.findByRole("heading", {
      name: "Torta Moka",
    });
    const tarjetaComun = screen.getByRole("heading", { name: "Torta Frutilla" });

    expect(
      tarjetaDelicia.closest(".producto").querySelector("[data-testid='badge-delicia']")
    ).toBeInTheDocument();
    expect(
      tarjetaComun.closest(".producto").querySelector("[data-testid='badge-delicia']")
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("badge-delicia")).toHaveLength(1);
  });

  test("si la delicia del día falla, el catálogo se muestra sin badge (fallback)", async () => {
    ProductosService.obtenerDeliciaDelDia.mockRejectedValue(new Error("404"));

    montar();

    expect(await screen.findByRole("heading", { name: "Torta Moka" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Torta Frutilla" })).toBeInTheDocument();
    expect(screen.queryByTestId("badge-delicia")).not.toBeInTheDocument();
  });

  test("al agregar un producto se muestra el toast de 'agregado al carrito'", async () => {
    ProductosService.obtenerDeliciaDelDia.mockRejectedValue(new Error("404"));
    pedirCantidad.mockResolvedValue(2);

    montar();

    const tarjeta = (await screen.findByRole("heading", { name: "Torta Moka" })).closest(".producto");
    fireEvent.click(within(tarjeta).getByRole("button", { name: /Agregar al carrito/i }));

    // El aviso es el toast compacto del mismo SweetAlert2 de la compra
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(Swal.fire.mock.calls[0][0]).toMatchObject({
      toast: true,
      position: "top",
      timer: 3000,
      showCloseButton: true,
      title: expect.stringMatching(/<span class="toast-carrito-nombre">Torta Moka<\/span> agregado al carrito/i),
      html: expect.stringContaining("/img/"),
    });
  });
});

describe("Delicias - catálogo no disponible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Con el servicio caído el spinner se apaga: antes la página quedaba en
    // blanco total, con el título y nada más
    ProductosService.obtenerProductos.mockRejectedValue(new Error("catalogo-service caido"));
    ProductosService.obtenerDeliciaDelDia.mockRejectedValue(new Error("404"));
  });

  const montar = () =>
    render(
      <CarritoProvider>
        <Delicias />
      </CarritoProvider>
    );

  test("si catalogo-service no responde, la página lo dice en vez de quedar en blanco", async () => {
    montar();

    expect(await screen.findByTestId("delicias-error")).toBeInTheDocument();
    expect(screen.getByTestId("delicias-error")).toHaveTextContent(/No se pudo cargar el catálogo/i);
    // Ni el spinner infinito ni el título solo, que es como se veía antes
    expect(screen.queryByText(/Cargando delicias/i)).not.toBeInTheDocument();
  });

  test("el aviso ofrece Reintentar y vuelve a pedir el catálogo", async () => {
    // La primera llamada falla (estado de la beforeEach); tras el reintento,
    // el servicio ya responde con el catálogo real
    ProductosService.obtenerProductos
      .mockRejectedValueOnce(new Error("catalogo-service caido"))
      .mockResolvedValue(CATALOGO);
    ProductosService.obtenerDeliciaDelDia.mockResolvedValue(CATALOGO.tortas[0]);

    montar();
    fireEvent.click(await screen.findByTestId("delicias-reintentar"));

    expect(await screen.findByRole("heading", { name: "Torta Moka" })).toBeInTheDocument();
    expect(ProductosService.obtenerProductos).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("delicias-error")).not.toBeInTheDocument();
  });

  // Un catálogo vacío LEGITIMO (200 con {}) sigue mostrando su estado vacío:
  // el aviso de error solo aparece cuando la promesa rechaza
  test("con un catálogo vacío legítimo no aparece el aviso de error", async () => {
    ProductosService.obtenerProductos.mockResolvedValue({});
    ProductosService.obtenerDeliciaDelDia.mockResolvedValue(null);

    montar();

    expect(await screen.findByRole("heading", { name: "Nuestro Catálogo" })).toBeInTheDocument();
    expect(screen.queryByTestId("delicias-error")).not.toBeInTheDocument();
  });
});
