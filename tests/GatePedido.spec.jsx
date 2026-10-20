import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import App from "../src/App";
import Login from "../src/pages/Login";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom";

// Login monta <GoogleLogin />, que exige GoogleOAuthProvider: lo stubbeamos
// con un click real que entrega una credencial decodificable (login de cliente = Google).
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button
      data-testid="google-login-stub"
      onClick={() =>
        onSuccess({
          credential: [
            "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
            btoa(JSON.stringify({ given_name: "Cliente Test" })),
            "x",
          ].join("."),
        })
      }
    />
  ),
}));

vi.mock("../src/service/AuthService", () => ({
  loginAdmin: vi.fn(),
}));

// Flujo completo "conectarse": el invitado en /pedido ve el teaser con el beneficio,
// el CTA lleva al login con retorno, y tras el login exitoso vuelve a /pedido.
describe("Gate de /pedido para invitados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  const abrirRuta = (entrada) =>
    render(
      <MemoryRouter initialEntries={entrada}>
        <App />
      </MemoryRouter>
    );

  test("1. Invitado en /pedido ve el teaser con el beneficio y no el formulario", () => {
    abrirRuta(["/pedido"]);

    expect(screen.getByTestId("teaser-pedido")).toBeInTheDocument();
    expect(screen.getByText(/10% de descuento/i)).toBeInTheDocument();
    // El formulario con el select de productos no se muestra a invitados
    expect(screen.queryByPlaceholderText("Ej: María Pérez")).not.toBeInTheDocument();
  });

  test("2. El CTA del teaser lleva al login con retorno a /pedido", () => {
    abrirRuta(["/pedido"]);

    const cta = screen.getByRole("link", { name: /iniciar sesión/i });
    expect(cta).toHaveAttribute("href", "/login?redirect=/pedido");
  });

  test("3. Quien ya se conectó antes ve el teaser sin prometer el 10%", () => {
    localStorage.setItem("md_primera_conexion", "1");

    abrirRuta(["/pedido"]);

    expect(screen.getByTestId("teaser-pedido")).toBeInTheDocument();
    expect(screen.queryByText(/10% de descuento/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  test("4. Con sesión activa, /pedido muestra el formulario normal", () => {
    sessionStorage.setItem("userToken", "fake-token");

    abrirRuta(["/pedido"]);

    expect(screen.getByPlaceholderText("Ej: María Pérez")).toBeInTheDocument();
    expect(screen.queryByTestId("teaser-pedido")).not.toBeInTheDocument();
  });

  test("5. Tras login de cliente (Google) con ?redirect=/pedido vuelve a /pedido", async () => {
    render(
      <MemoryRouter initialEntries={["/login?redirect=/pedido"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pedido" element={<div data-testid="llego-pedido" />} />
          <Route path="/" element={<div data-testid="llego-home" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("google-login-stub"));

    expect(await screen.findByTestId("llego-pedido")).toBeInTheDocument();
    expect(sessionStorage.getItem("userRole")).toBe("cliente");
  });

  test("6. Sin redirect, el login de cliente (Google) aterriza en el Home (como siempre)", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div data-testid="llego-home" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("google-login-stub"));

    expect(await screen.findByTestId("llego-home")).toBeInTheDocument();
    expect(sessionStorage.getItem("userToken")).not.toBeNull();
  });
});
