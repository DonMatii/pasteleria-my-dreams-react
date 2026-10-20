import { loginAdmin } from "../src/service/AuthService";
import apiClient from "../src/service/apiClient";
import { vi, describe, test, expect, beforeEach } from "vitest";

// S2: loginAdmin — bypass unico de administrador + POST /api/auth/login.
// El bypass cliente/cliente123 queda eliminado (login de cliente = Google).
vi.mock("../src/service/apiClient", () => ({
  default: { post: vi.fn() },
}));

describe("AuthService.loginAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("bypass admin/admin123 concede token de administrador sin llamar al backend", async () => {
    const data = await loginAdmin("admin", "admin123");

    expect(data.token).toBe("token-admin-temporal-8digital");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  test("credenciales de cliente NO tienen bypass: van al backend real", async () => {
    apiClient.post.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(loginAdmin("cliente", "cliente123")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
      username: "cliente",
      password: "cliente123",
    });
  });

  test("otras credenciales usan POST /api/auth/login y devuelven la respuesta", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { token: "token-del-backend" } });

    const data = await loginAdmin("otro", "pass");

    expect(data).toEqual({ token: "token-del-backend" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
      username: "otro",
      password: "pass",
    });
  });
});
