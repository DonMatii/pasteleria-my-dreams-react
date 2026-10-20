import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../src/pages/Login";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import '@testing-library/jest-dom';

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

// S1: /login es SOLO de clientes con Google (la seccion de administrador
// vive ahora en /admin/login, probada en AdminLogin.spec).
describe("Login de clientes (solo Google)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  test("1. NO muestra formulario ni seccion de administrador (separacion)", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.queryByPlaceholderText("Ej: admin")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Contraseña")).not.toBeInTheDocument();
    expect(screen.queryByText(/Acceso de Administrador/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ingresar como Administrador/i })).not.toBeInTheDocument();
  });

  test("2. Renderiza la seccion de acceso con Google (stub del OAuth)", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByText(/Acceso para Clientes/i)).toBeInTheDocument();
    expect(screen.getByTestId("google-login-stub")).toBeInTheDocument();
  });

  test("3. Login con Google guarda token, nombre y rol de cliente", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    fireEvent.click(screen.getByTestId("google-login-stub"));

    expect(sessionStorage.getItem("userToken")).not.toBeNull();
    expect(sessionStorage.getItem("userName")).toBe("Cliente Test");
    expect(sessionStorage.getItem("userRole")).toBe("cliente");
  });
});
