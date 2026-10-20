import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "../src/pages/AdminLogin";
import * as AuthService from "../src/service/AuthService";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom";

// S2: /admin/login es SOLO del administrador (formulario usuario/contraseña, sin Google).
vi.mock("../src/service/AuthService", () => ({
  loginAdmin: vi.fn(),
}));

describe("AdminLogin (separacion admin/cliente)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const montar = (entrada = "/admin/login") =>
    render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<div data-testid="llego-panel" />} />
        </Routes>
      </MemoryRouter>
    );

  test("1. Tiene formulario de administrador y NO acceso de clientes con Google", () => {
    montar();

    expect(screen.getByPlaceholderText("Ej: admin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ingresar como Administrador/i })).toBeInTheDocument();
    // Separacion: el login de cliente (Google) no vive en esta pagina
    expect(screen.queryByTestId("google-login-stub")).not.toBeInTheDocument();
    expect(screen.queryByText(/Acceso para Clientes/i)).not.toBeInTheDocument();
  });

  test("2. Muestra error ante credenciales vacias sin llamar al servicio", async () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: /Ingresar como Administrador/i }));

    const mensaje = await screen.findByText(/Por favor, completa todos los campos/i);
    expect(mensaje).toBeInTheDocument();
    expect(AuthService.loginAdmin).not.toHaveBeenCalled();
  });

  test("3. Muestra error cuando el servicio de login falla con 401", async () => {
    AuthService.loginAdmin.mockRejectedValueOnce({ response: { status: 401 } });

    montar();

    fireEvent.change(screen.getByPlaceholderText("Ej: admin"), { target: { value: "errorUser" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "wrongPass" } });
    fireEvent.click(screen.getByRole("button", { name: /Ingresar como Administrador/i }));

    expect(await screen.findByText(/Usuario o contraseña incorrectos/i)).toBeInTheDocument();
    expect(AuthService.loginAdmin).toHaveBeenCalledWith("errorUser", "wrongPass");
    expect(sessionStorage.getItem("userToken")).toBeNull();
  });

  test("4. Login exitoso guarda token, nombre y rol admin, y entra al panel", async () => {
    AuthService.loginAdmin.mockResolvedValueOnce({ token: "fake-admin-token" });

    montar();

    fireEvent.change(screen.getByPlaceholderText("Ej: admin"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Ingresar como Administrador/i }));

    expect(await screen.findByTestId("llego-panel")).toBeInTheDocument();
    expect(AuthService.loginAdmin).toHaveBeenCalledWith("admin", "123456");
    expect(sessionStorage.getItem("userToken")).toBe("fake-admin-token");
    expect(sessionStorage.getItem("userName")).toBe("admin");
    expect(sessionStorage.getItem("userRole")).toBe("admin");
  });

  test("5. Redirige al panel guardando datos aunque se llega con ?redirect (el admin siempre cae en /admin)", async () => {
    AuthService.loginAdmin.mockResolvedValueOnce({ token: "fake-admin-token" });

    montar("/admin/login?redirect=/pedido");

    fireEvent.change(screen.getByPlaceholderText("Ej: admin"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "admin123" } });
    fireEvent.click(screen.getByRole("button", { name: /Ingresar como Administrador/i }));

    expect(await screen.findByTestId("llego-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("llego-pedido")).not.toBeInTheDocument();
  });
});
