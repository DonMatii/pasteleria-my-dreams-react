# Credenciales de demo — Pastelería My Dreams

Accesos de prueba para desarrollo local. Desde la separación admin/cliente (v3) los flujos son distintos:

| Acceso            | Cómo se entra                                             | Uso                                   |
|-------------------|-----------------------------------------------------------|---------------------------------------|
| `admin` / `admin123` | Formulario en `/admin/login` (bypass en `src/service/AuthService.js`) | Panel de administración (`/admin`) |
| Cliente           | Botón de Google en `/login` (`VITE_GOOGLE_CLIENT_ID`)     | Tienda y pedidos                      |

> **Nota:** son credenciales de demostración para el proyecto de clases. No son usuarios
> reales de la base de datos; existen solo para probar en local sin depender del backend de
> autenticación (`POST /api/auth/login` aún no existe). El bypass de cliente
> (`cliente`/`cliente123`) fue eliminado: el acceso de clientes es únicamente con Google.
