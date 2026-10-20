import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import App from "../src/App";
import Login from "../src/pages/Login";
import Header from "../src/components/Header";
import { CarritoProvider } from "../src/context/CarritoContext";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";

// Regresion de la separacion admin/cliente (S1, S2, S3).
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button
      data-testid="google"
      onClick={() =>
        onSuccess({
          credential: [
            "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
            btoa(JSON.stringify({ given_name: "Ana" })),
            "x",
          ].join("."),
        })
      }
    />
  ),
}));
vi.mock("../src/service/AuthService", () => ({ loginAdmin: vi.fn() }));
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(() => Promise.resolve([])),
  obtenerDeliciaDelDia: vi.fn(() => Promise.reject(new Error("sin delicia"))),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  eliminarProducto: vi.fn(),
}));
vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(() => Promise.resolve({})),
}));

const abrirApp = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>
  );

const montarLogin = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>
  );

const sesion = (token, rol, nombre = "Cuenta") => {
  sessionStorage.setItem("userToken", token);
  sessionStorage.setItem("userRole", rol);
  sessionStorage.setItem("userName", nombre);
};

describe("S1 - login de cliente solo con Google", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  test("Google guarda token, given_name, rol cliente y primera conexion", () => {
    montarLogin("/login");
    fireEvent.click(screen.getByTestId("google"));
    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(sessionStorage.getItem("userToken")).toBeTruthy();
    expect(sessionStorage.getItem("userName")).toBe("Ana");
    expect(sessionStorage.getItem("userRole")).toBe("cliente");
    expect(localStorage.getItem("md_primera_conexion")).toBe("1");
  });

  test.each(["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com"])(
    "redirect no interno %s cae en Home",
    (destino) => {
      montarLogin("/login?redirect=" + encodeURIComponent(destino));
      fireEvent.click(screen.getByTestId("google"));
      expect(screen.getByTestId("home")).toBeInTheDocument();
    }
  );

  test("cliente con redirect=/pedido termina en el formulario de pedido", async () => {
    abrirApp("/login?redirect=/pedido");
    fireEvent.click(screen.getByTestId("google"));
    expect(await screen.findByPlaceholderText("Ej: María Pérez")).toBeInTheDocument();
    expect(sessionStorage.getItem("userRole")).toBe("cliente");
  });
});

describe("S3 - /admin exige rol admin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  test("cliente con Google no entra a /admin: ve el login de administrador", () => {
    sesion("token-google", "cliente", "Ana");
    abrirApp("/admin");
    expect(screen.getByPlaceholderText("Ej: admin")).toBeInTheDocument();
    expect(screen.queryByText(/Gestión My Dreams/i)).not.toBeInTheDocument();
  });

  test("sesion antigua con token sin userRole no entra a /admin", () => {
    sessionStorage.setItem("userToken", "token-viejo");
    sessionStorage.setItem("userName", "admin");
    abrirApp("/admin");
    expect(screen.getByPlaceholderText("Ej: admin")).toBeInTheDocument();
    expect(screen.queryByText(/Gestión My Dreams/i)).not.toBeInTheDocument();
  });

  test("sesion con userRole=admin entra al panel", async () => {
    sesion("token-admin", "admin", "admin");
    abrirApp("/admin");
    expect(await screen.findByText(/Gestión My Dreams/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ej: admin")).not.toBeInTheDocument();
  });

  test("/pedido conserva: invitado ve el teaser", () => {
    const { unmount } = abrirApp("/pedido");
    expect(screen.getByTestId("teaser-pedido")).toBeInTheDocument();
    unmount();
  });

  test("/pedido conserva: cliente ve el formulario", () => {
    sesion("token-cliente", "cliente", "Ana");
    const { unmount } = abrirApp("/pedido");
    expect(screen.getByPlaceholderText("Ej: María Pérez")).toBeInTheDocument();
    unmount();
  });

  test("/pedido conserva: admin ve el formulario", () => {
    sesion("token-admin", "admin", "admin");
    const { unmount } = abrirApp("/pedido");
    expect(screen.getByPlaceholderText("Ej: María Pérez")).toBeInTheDocument();
    unmount();
  });
});

describe("S2 - link Admin del Header por rol", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const montarHeader = () =>
    render(
      <MemoryRouter>
        <CarritoProvider>
          <Header />
        </CarritoProvider>
      </MemoryRouter>
    );

  test("userRole=admin muestra el link", () => {
    sesion("t", "admin", "quien-sea");
    montarHeader();
    expect(screen.getByRole("link", { name: /Admin/i })).toBeInTheDocument();
  });

  test("nombre 'admin' sin rol no muestra el link", () => {
    sessionStorage.setItem("userName", "admin");
    montarHeader();
    expect(screen.queryByRole("link", { name: /Admin/i })).not.toBeInTheDocument();
  });
});
