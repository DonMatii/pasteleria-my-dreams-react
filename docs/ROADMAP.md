# Roadmap — Pastelería My Dreams (producto real)

> Este documento asume que el proyecto deja de ser una entrega universitaria y se convierte en el negocio real de Cathi y Matías. Cada fase tiene un objetivo de negocio, no solo técnico. El estado actual (rama `version-3`, commit `bc44e7d`) es la **Fase 0**.

## Estado actual (Fase 0 — MVP funcional) ✅

- Catálogo público, carrito compartido, checkout, tracking por código.
- Panel admin con CRUD de productos, dashboard (KPIs, ranking, ventas 7 días, pedidos recibidos).
- Auth dual (Google OAuth clientes + login admin), guards por rol.
- Microservicios Spring Boot + Kafka + MySQL (RDS en prod).
- Frontend React 19 + Vite, tests Vitest (203), accesibilidad axe, reduced-motion.
- Manejo honesto de errores (P0-3 cerrado): un servicio caído se reporta, no se disfraza de vacío.

**Deuda técnica conocida:** admin entra con `admin/admin123` (bypass local), `X-Api-Key` en el front, sin observabilidad, sin SEO real, tablas admin no responsive, title genérico.

---

## Fase 1 — Lanzamiento seguro (Entrega 3 + hardening) · 2-4 semanas

Objetivo de negocio: **poder mostrar la página a clientes reales sin miedo.**

### Seguridad (bloqueante para lanzar)
- [ ] Reemplazar bypass `admin/admin123` por auth real con JWT (expiración + refresh) en `pedidos-service`/`catalogo-service`.
- [ ] Sacar `VITE_ADMIN_API_KEY` del bundle del front: las llamadas admin deben ir por un proxy/backend-for-frontend o por sesión autenticada, nunca con la key en el navegador.
- [ ] Rate limiting en endpoints públicos (`/api/productos`, `/api/pedidos`).
- [ ] CORS estricto por origen (hoy `*` en dev).
- [ ] HTTPS end-to-end (CloudFront delante de S3, certificado ACM).

### Infraestructura (Entrega 3 — AWS/Kinesis)
- [ ] Integrar Kinesis para eventos de negocio: `pedido_creado`, `pedido_estado_cambiado`, `producto_visto`. Esto alimenta el dashboard y la analítica.
- [ ] CloudWatch + alarmas: si un servicio cae, aviso por email/Slack.
- [ ] Backups automáticos de RDS (snapshot diario + retención 7 días).
- [ ] Entorno de staging separado del prod (hoy todo es "local vs AWS").

### UX móvil (clientes compran en celular)
- [ ] Revisar flujo completo de compra en 360px: catálogo → carrito → checkout → tracking.
- [ ] Tablas del admin colapsan a cards en <768px (hoy scroll horizontal).
- [ ] Lighthouse mobile ≥ 90 en performance y accessibility.

### SEO y descubribilidad local
- [ ] `<title>` y `<meta description>` por ruta (react-helmet o SSR/prerender).
- [ ] Open Graph + imagen de preview para compartir en WhatsApp/Instagram.
- [ ] `sitemap.xml` y `robots.txt`.
- [ ] Schema.org `LocalBusiness` + `Product` para aparecer en búsquedas "pastelería cerca de mí".
- [ ] Google Business Profile vinculado al sitio.

### Observabilidad
- [ ] Sentry en front y back (errores reales, no solo `console.error`).
- [ ] Logs estructurados (JSON) en los microservicios.
- [ ] Uptime check externo (UptimeRobot o CloudWatch Synthetics).

**Criterio de salida de Fase 1:** Cathi puede compartir el link a 10 personas reales y no hay caídas, errores silenciosos ni datos expuestos.

---

## Fase 2 — Operación real · 1-3 meses

Objetivo de negocio: **Cathi opera el negocio sin depender de Matías para cada cambio.**

### Gestión de contenido por Cathi
- [ ] Panel de edición de productos más amigable: subir foto desde el navegador (S3 presigned URL), editar precio/stock inline, activar/desactivar.
- [ ] Historial de cambios de precio (auditoría).
- [ ] Gestión de categorías y secciones del catálogo sin tocar código.

### Pagos reales
- [ ] Integrar pasarela (MercadoPago / Webpay / Flow) para el total del pedido.
- [ ] Estados de pago (pendiente / aprobado / rechazado) vinculados al pedido.
- [ ] Email de confirmación solo tras pago aprobado (hoy se envía al registrar).

### Comunicación con el cliente
- [ ] WhatsApp Business API para avisos de estado (más leído que email en Chile).
- [ ] Recordatorio de pedido abandonado (carrito con items > 24h).
- [ ] Newsletter / promociones a clientes registrados (opt-in).

### Analítica de negocio (sobre Kinesis)
- [ ] Dashboard de Cathi: productos más vistos, tasa de conversión, abandono de carrito.
- [ ] Reporte semanal automático por email: ventas, top productos, nuevos clientes.
- [ ] Cohortes: clientes recurrentes vs nuevos.

### Performance
- [ ] Imágenes a WebP con `srcset` y lazy loading real (no solo `loading="lazy"`).
- [ ] Cache de catálogo en CDN (CloudFront) con invalidación al editar.
- [ ] Code splitting por ruta (hoy el bundle es único).

### Legal
- [ ] Política de privacidad, términos y condiciones, política de cookies.
- [ ] Consentimiento explícito para cookies no esenciales.
- [ ] Cumplimiento Ley 19.628 (protección de datos personales, Chile).

**Criterio de salida de Fase 2:** Cathi gestiona catálogo y pedidos sola; los clientes pagan online; hay datos para tomar decisiones.

---

## Fase 3 — Crecimiento · 3-6 meses

Objetivo de negocio: **aumentar ticket promedio y recurrencia.**

- [ ] Cupones y descuentos configurables (hoy solo `BIENVENIDO10` y delicia del día hardcoded).
- [ ] Programa de fidelidad (puntos por compra, canje).
- [ ] Reseñas y fotos de clientes en productos.
- [ ] Recomendaciones ("quienes compraron X también llevaron Y") sobre datos de Kinesis.
- [ ] Zonas de despacho con costo por comuna, y retiro en tienda.
- [ ] Calendario de pedidos (tortas con fecha de entrega futura).
- [ ] Versión PWA / app instalable (offline básico del catálogo).
- [ ] Multi-idioma (español neutro + inglés para turistas, si aplica).

---

## Fase 4 — Escala · 6-12 meses

Objetivo de negocio: **el negocio crece sin reescribir la plataforma.**

- [ ] Multi-tienda / franquicia (si el modelo lo requiere): tenant por sucursal.
- [ ] Inventario en tiempo real con alertas de stock bajo.
- [ ] Integración con proveedores (insumos, harina, etc.).
- [ ] Predicción de demanda sobre datos históricos (ML sobre Kinesis/Kafka).
- [ ] A/B testing de precios y promociones.
- [ ] API pública para integraciones (delivery, contabilidad).

---

## Lo que NO haría (y por qué)

- **Reescribir el frontend en otro framework.** React 19 + Vite está bien; el costo no se justifica.
- **Microservicios adicionales sin necesidad.** Hoy hay 4 (catálogo, pedidos, estadísticas, notificaciones). Cada uno nuevo es operación extra. Agregar solo si un dominio lo exige.
- **App móvil nativa antes de validar demanda.** PWA primero; nativa solo si las métricas lo piden.
- **Multi-tenant antes de tener un segundo local.** YAGNI.

## Regla de oro para priorizar

> Si una tarea no mejora una de estas tres métricas, se posterga: **ventas**, **retención de clientes**, o **tiempo de Cathi** (liberarla de tareas manuales). Todo lo demás es nice-to-have.

## Próximo paso inmediato

Cerrar **Fase 1** arrancando por la seguridad (bloqueante) y la infraestructura de Entrega 3 (Kinesis + CloudWatch + backups). El resto de Fase 1 (mobile, SEO, observabilidad) se puede hacer en paralelo mientras se valida la entrega con el profe.
