import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../src/pages/Login";
import * as AuthService from "../src/service/AuthService";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import '@testing-library/jest-dom';

// Login renderiza <GoogleLogin /> de @react-oauth/google, que exige
// estar dentro de un GoogleOAuthProvider. En tests lo sustituimos por un stub.
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="google-login-stub" />,
}));

vi.mock("../src/service/AuthService", () => ({ 
  loginUsuario: vi.fn() 
}));

describe("Pruebas de Seguridad - Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  test("1. Muestra error ante credenciales vacías", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    // El formulario usa noValidate y no tiene 'required', así que
    // handleSubmit corre y aplica la validación propia de React.
    const userInput = screen.getByPlaceholderText("Ej: admin");
    const passInput = screen.getByPlaceholderText("Contraseña");

    expect(userInput).toBeInTheDocument();
    expect(passInput).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    const mensaje = await screen.findByText(/Por favor, completa todos los campos/i);
    expect(mensaje).toBeInTheDocument();
    expect(AuthService.loginUsuario).not.toHaveBeenCalled();
  });

  test("2. Muestra error cuando el servicio de login falla con 401", async () => {
    const mockError = { response: { status: 401 } };
    AuthService.loginUsuario.mockRejectedValueOnce(mockError);

    render(<MemoryRouter><Login /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText("Ej: admin"), { target: { value: "errorUser" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "wrongPass" } });
    fireEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    expect(await screen.findByText(/Usuario o contraseña incorrectos/i)).toBeInTheDocument();
    expect(AuthService.loginUsuario).toHaveBeenCalledWith("errorUser", "wrongPass");
    expect(sessionStorage.getItem("userToken")).toBeNull();
  });

  test("3. Redirige y guarda datos en sessionStorage tras login exitoso", async () => {
    AuthService.loginUsuario.mockResolvedValueOnce({ token: "fake-token-123" });

    render(<MemoryRouter><Login /></MemoryRouter>);
    
    fireEvent.change(screen.getByPlaceholderText("Ej: admin"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    await waitFor(() => {
      expect(AuthService.loginUsuario).toHaveBeenCalledWith("admin", "123456");
      expect(sessionStorage.getItem("userToken")).toBe("fake-token-123");
      expect(sessionStorage.getItem("userName")).toBe("admin");
    });
  });

  test("4. Renderiza la sección de acceso con Google (stub del OAuth)", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByText(/Acceso para Clientes/i)).toBeInTheDocument();
    expect(screen.getByTestId("google-login-stub")).toBeInTheDocument();
  });
});
