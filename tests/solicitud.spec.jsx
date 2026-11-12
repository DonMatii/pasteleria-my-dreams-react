/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock de apiClient (mismo patrón que tests/versionGating.spec.jsx): el contexto
// de versión consulta GET /api/usuarios/version y el formulario de solicitud
// publica POST /api/solicitudes.
vi.mock("../src/service/apiClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  URL_BASE: "http://test",
}));

// Catálogo mockeado (mismo patrón que tests/Pedido.spec.jsx): aplanarCatalogo
// queda real porque la ventanita del selector lo reutiliza
vi.mock("../src/service/ProductosService", async (importOriginal) => ({
  ...(await importOriginal()),
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
}));

import apiClient from "../src/service/apiClient";
import {
  obtenerProductos,
  obtenerDeliciaDelDia,
} from "../src/service/ProductosService";
import App from "../src/App";

// Respuesta cruda de GET /api/productos (mapa agrupado por categoría)
const catalogoCrudo = {
  tortas: [
    { id: 9, nombre: "Torta Moka", precio: 15000, imagenUrl: "moka.jpg", categoria: "tortas" },
  ],
  personales: [
    { id: 13, nombre: "Muffins Plátano Arándano", precio: 2500, imagenUrl: "muffin.jpg", categoria: "personales" },
  ],
};

const abrirPedido = () =>
  render(
    <MemoryRouter initialEntries={["/pedido"]}>
      <App />
    </MemoryRouter>
  );

// Sesión de cliente con Google: el email de la sesión define la versión consultada
const conectarComo = (email, version) => {
  sessionStorage.setItem("userToken", "fake-token");
  sessionStorage.setItem("userRole", "cliente");
  sessionStorage.setItem("userEmail", email);
  apiClient.get.mockResolvedValue({ data: { email, version } });
};

describe("Formulario de solicitud de pedido (Versión 1, S2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    // Por defecto no hay delicia del día y la ventanita responde con el catálogo
    obtenerDeliciaDelDia.mockRejectedValue(new Error("sin delicia del día"));
    obtenerProductos.mockResolvedValue(catalogoCrudo);
  });

  test("1. El usuario V1 en /pedido ve el formulario de solicitud, no el checkout", async () => {
    conectarComo("catherine.godoy.g@gmail.com", 1);
    abrirPedido();

    expect(
      await screen.findByRole("button", { name: /Enviar solicitud/i })
    ).toBeInTheDocument();
    // La compra con carrito no está habilitada en la V1
    expect(
      screen.queryByRole("button", { name: /Registrar pedido/i })
    ).not.toBeInTheDocument();
    // El correo del login queda prellenado en el formulario
    expect(screen.getByLabelText(/Correo Electrónico/i)).toHaveValue(
      "catherine.godoy.g@gmail.com"
    );
    // La versión se consultó con el email de la sesión
    expect(apiClient.get).toHaveBeenCalledWith("/api/usuarios/version", {
      params: { email: "catherine.godoy.g@gmail.com" },
    });
  });

  test("2. El usuario V2 en /pedido ve el checkout de siempre", async () => {
    conectarComo("mat.suazog@duocuc.cl", 2);
    abrirPedido();

    expect(
      await screen.findByRole("button", { name: /Registrar pedido/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Enviar solicitud/i })
    ).not.toBeInTheDocument();
  });

  test("3. El envío exitoso publica la solicitud y muestra la confirmación", async () => {
    conectarComo("catherine.godoy.g@gmail.com", 1);
    apiClient.post.mockResolvedValue({ status: 201, data: { id: 1 } });
    abrirPedido();

    // Se eligen productos con cantidades desde la ventanita del catálogo
    fireEvent.click(
      await screen.findByRole("button", { name: /Elegir productos/i })
    );
    const tarjeta = (await screen.findByText("Torta Moka")).closest(
      ".modal-tarjeta"
    );
    fireEvent.click(
      within(tarjeta).getByRole("button", { name: /Sumar Torta Moka/i })
    );
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: /Cerrar/i }));

    fireEvent.change(screen.getByLabelText(/Nombre del Cliente/i), {
      target: { value: "Catherine Test" },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), {
      target: { value: "+56 9 1234 5678" },
    });
    fireEvent.change(screen.getByLabelText(/Mensaje/i), {
      target: { value: "Para el sábado por la tarde" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar solicitud/i }));

    // El body lleva el detalle en texto legible (productos y cantidades)
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/solicitudes", {
        nombre: "Catherine Test",
        email: "catherine.godoy.g@gmail.com",
        telefono: "+56 9 1234 5678",
        detalle: "Torta Moka x2",
        mensaje: "Para el sábado por la tarde",
      });
    });

    // Y se muestra la tarjeta de confirmación
    expect(
      await screen.findByText("Recibimos tu solicitud — te contactaremos pronto")
    ).toBeInTheDocument();
  });

  test("4. Los campos obligatorios bloquean el envío sin llamar al backend", async () => {
    conectarComo("catherine.godoy.g@gmail.com", 1);
    abrirPedido();

    const boton = await screen.findByRole("button", {
      name: /Enviar solicitud/i,
    });
    // El correo viene prellenado de la sesión: se vacía para probar que es obligatorio
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: "" },
    });
    fireEvent.click(boton);

    expect(
      await screen.findByText(/Por favor, ingresa tu nombre/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ingresa un correo electrónico válido/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Por favor, ingresa tu teléfono/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Agrega al menos un producto/i)
    ).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  test("5. Compatibilidad: una sesión sin email sigue viendo el checkout (acceso completo)", async () => {
    // Sesión previa al sistema de versiones (sin userEmail): acceso completo
    sessionStorage.setItem("userToken", "fake-token");
    sessionStorage.setItem("userRole", "cliente");
    abrirPedido();

    expect(
      await screen.findByRole("button", { name: /Registrar pedido/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Enviar solicitud/i })
    ).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
