# 🧁 Pastelería My Dreams — Fullstack Web App

¡Bienvenido a la versión final de **Pastelería My Dreams**! 🚀
Este proyecto ha evolucionado de un sitio estático a una aplicación **Fullstack** robusta y modular. Se reconstruyó como una **Single Page Application (SPA)** con React, conectada a una **arquitectura distribuida de microservicios** en Java Spring Boot y respaldada por una base de datos relacional MySQL (Amazon RDS en la nube; XAMPP o Docker en desarrollo local).

---

## 📌 Versiones del proyecto

Cada versión del proyecto vive en su propia rama. Son tres, y no son tres proyectos distintos: es el mismo código. La rama se corta al momento de entregar y queda congelada ahí.

| Rama | Versión | Contenido | URL desplegada |
| :--- | :--- | :--- | :--- |
| `version-1` (tag `entrega-1`) | **Entrega 1** | Catálogo con CRUD, panel de administración, login con Google y contacto por Formspree. | http://pasteleria-my-dreams-frontend.s3-website-us-east-1.amazonaws.com/ |
| `version-2` (tag `entrega-2`) | **Entrega 2** | Comunicación asíncrona con colas usando Apache Kafka. | http://pasteleria-my-dreams-web-8digital.s3-website-us-east-1.amazonaws.com/ |
| `version-3` | **Unidad 3** | Catálogo público sin iniciar sesión, carrito compartido y mini carrito lateral con selector de cantidad, dashboard de administración con períodos y ranking, animaciones de entrada al scroll y la página *Nuestra historia*. | — |

`main` siempre lleva el último avance del desarrollo.

---

## ✨ Logros de esta Entrega Final

* **Arquitectura de Microservicios en la Nube:** Conexión en tiempo real con microservicios independientes en Java Spring Boot desplegados en AWS EC2, orquestados mediante **AWS API Gateway** con enrutamiento de proxy y gestión completa de CORS.
* **Admin Panel Pro:** Panel de administración protegido para gestionar el inventario del catálogo (CRUD completo: Crear, Leer, Actualizar, Borrar) y un **dashboard de ventas con períodos claros**: un selector **Día / Semana / Mes** (períodos en curso) cambia las cifras de ventas y pedidos del período elegido, una **barra de avance hacia la meta** muestra cuánto se cumplió (la meta se define **en pesos**, con símbolo `$`, placeholder de ejemplo y ayuda que aclaran que el valor es un monto monetario, y se guarda en `estadisticas-service`; al alcanzarla el panel avisa **"¡Meta alcanzada!"**), un ranking **"🏆 Más vendidos"** destaca los **3 productos top** del período con medallas, y la sección **"Qué se vendió"** lista cada producto con su **foto, unidades y monto**; esa lista y la **ventana de los últimos 7 días** (integrada en la misma tarjeta) se pueden **ordenar** —por producto, valor o unidades, y por fecha, pedidos o ventas—, y las **tres secciones del dashboard se pueden plegar** con un botón **Abrir / Cerrar**. Todo se calcula a partir de los pedidos reales que llegan por Kafka.
* **Autenticación Segura (IDaaS):** Implementación de Google OAuth 2.0 para la autenticación de clientes y acceso administrativo con credenciales propias, en páginas separadas (`/login` para clientes y `/admin/login` para la gestión del panel).
* **Persistencia de Datos en AWS RDS:** Gestión de productos vinculada a una base de datos relacional alojada en la nube mediante Spring Data JPA e Hibernate, permitiendo sincronización inmediata.
* **Contacto Funcional:** Integración con el servicio **Formspree** para la recepción de mensajes reales, garantizando una comunicación efectiva con el cliente.
* **Accesibilidad:** Selector de cantidad con botones `−` y `+` de gran superficie —en el mini carrito, en las filas del checkout y en las tarjetas de la ventana del catálogo— en reemplazo de los inputs numéricos nativos, cuyas flechitas de 10px no pueden apuntar personas con baja visión. Todos los controles llevan etiquetas ARIA (`role="group"`, `aria-label`, `aria-live`) y el panel de administración anuncia **de qué producto** es cada acción ("Editar Torta Chocolate", no solo el emoji). El sitio trae **foco rosa visible** en todos los controles al navegar con teclado (WCAG 2.4.7), con jerarquía de títulos válida en cada página. La suite incluye una **red de seguridad de axe** (`tests/Axe.spec.jsx`) que escanea páginas en cada `npm test`: su única regla desactivada es `color-contrast` —por decisión de diseño la paleta de la pastelería no se toca— y el resto de las reglas corren completas.
* **Codigo de seguimiento destacado:** El codigo de seguimiento del pedido registrado se resalta en el color institucional dentro del modal de confirmacion, para que el cliente lo note y pueda anotarlo facilmente.
* **Experiencia de usuario viva:** el Home y el catálogo tienen entradas animadas al hacer scroll, y el hero se anima con gradiente que respira, entrada escalonada —todo respetando `prefers-reduced-motion`—; la navegación suma la página *Nuestra historia* (`/historia`), que presenta el origen familiar del proyecto, y el catálogo suma **pills de categoría** que quedan pegadas arriba al hacer scroll para saltar directo a cada sección; todas las páginas públicas usan fotos propias como fondo cubriendo toda la pantalla.
* **Descuento de la Delicia del Dia con nombre propio:** Cuando el backend aplica el descuento de la Delicia del Dia, el resumen del checkout y el mensaje de confirmacion nombran el producto concreto —por ejemplo, `Descuento Delicia del Dia (-10%) (Selva Negra)`— en vez de un generico, para que el cliente sepa exactamente que delicia le desconto.
* **Calidad de Software:** Implementación de pruebas unitarias con **Vitest** y reporte de cobertura de código.

---

## 🛠️ Stack Tecnológico

### **Frontend**
* ⚛️ **React 19 + Vite 7** (Arquitectura moderna y rápida)
* 🌐 **React Router 7** (Gestión de rutas dinámicas)
* 📡 **Axios** (Cliente HTTP para el consumo del backend a través de **AWS API Gateway**)
* 🧪 **Vitest + React Testing Library** (Garantía de calidad y pruebas unitarias)
* 🔐 **@react-oauth/google** (Integración con Google Identity Services)
* ☁️ **AWS (Amazon Web Services):** Despliegue distribuido utilizando **S3** (Hosting del Frontend), **EC2** (Hosting de microservicios Java) y **API Gateway** (Enrutamiento centralizado).

### **Backend & DevOps**
* ☕ Java 21 (Lenguaje base del ecosistema)
* 🍃 **Spring Boot** (Lógica de negocio y microservicios desacoplados)
* 🗄️ **AWS RDS (MySQL) & Hibernate JPA** (Gestión de base de datos relacional en la nube y ORM)
* 🛡️ Spring Security (Gestión de seguridad y filtros de autorización)
* 🏗️ Maven (Gestión de dependencias)
* 📨 **Apache Kafka** (Cola de mensajes en EC2, tópico `pedidos`; comunicación asíncrona entre servicios)
* 🌍 **Terraform** (Infraestructura como código en `infra/`)
* 📧 **Formspree** (Servicio externo de mensajería)

---

## 💻 Instalación y Ejecución

Para levantar el proyecto localmente, sigue estos pasos:

```bash
# 1. Clonar el repositorio
git clone https://github.com/DonMatii/pasteleria-my-dreams-react.git
```

```bash
# 2. Entrar a la carpeta del proyecto
cd pasteleria-my-dreams-react
```

```bash
# 3. Instalar todas las dependencias
npm install
```

```bash
# 4. Iniciar el servidor de desarrollo
npm run dev
```

## 🧪 Testing y Calidad

Para garantizar la robustez de la aplicación y una experiencia de usuario sin errores, se ha implementado una estrategia de pruebas unitarias utilizando **Vitest** y **React Testing Library**. 

### **Alcance de las Pruebas:**
* **Validación de Formularios:** Verificación de reglas de negocio en el formulario de contacto (campos obligatorios, formato de email y contador de caracteres).
* **Gestión de Inventario (CRUD):** Pruebas detalladas en el **Admin Panel** para asegurar el flujo de creación, lectura, eliminación y la **lógica de edición flexible** (donde la actualización de imagen es opcional).
* **Seguridad y Acceso:** Verificación del comportamiento de los componentes ante la presencia o ausencia de tokens de autenticación.
* **Animaciones y contenido nuevo:** prueba del componente `Revelar` (fallback sin `IntersectionObserver`, respeto de `prefers-reduced-motion` y desconexión del observer) y de la sección *Nuestra historia* (estructura de sus tres bloques, nombres públicos y ausencia de `Duoc`/`Inacap` en el copy).
* **Reporte de Cobertura (Coverage):** Seguimiento del porcentaje de código probado, asegurando que las funciones críticas tengan una cobertura superior al 90%.

### **Comandos de Ejecución:**

```bash
# Ejecutar la suite de pruebas completa
npx vitest run
```

```bash
# Generar reporte de cobertura detallado (%)
npx vitest run --coverage
```

```bash
# Abrir el dashboard gráfico de Vitest en el navegador
npx vitest --ui
```

## 🔄 Evolución del Proyecto (Hitos)
Fase 1: Maquetación inicial (HTML/CSS/JS Estático).

Fase 2: Migración a React y creación de componentes reutilizables.

Fase 3: Implementación de Pruebas Unitarias y validaciones de usuario.

Fase 4 (Meta Alcanzada): Integración total con Backend (Spring Boot), seguridad dual y despliegue exitoso en infraestructura Cloud (AWS S3, EC2, API Gateway y RDS) operando al 100%.

## 👩‍💻 Autor
Desarrollado con ❤️ por **Catherine Godoy** | 🔗 [Visita mi Perfil de GitHub](https://github.com/CatherineGodoy)
## Desarrollo local y demo (v2)

- **Proxy de Vite:** `vite.config.js` enruta `/api/productos` → `:8080`, `/api/pedidos` → `:8082` y `/api/estadisticas` → `:8081`, emulando en local lo que hace la API Gateway de AWS.
- **Entorno:** `.env.development` (gitignorado) define `VITE_API_BASE_URL=http://localhost:5173` (mismo origen, sin CORS) y `VITE_ADMIN_API_KEY`, que `apiClient` adjunta como header `X-Api-Key` a las llamadas administrativas. El `.env` principal conserva la URL de la API Gateway de AWS para producción.
- **Correo en local:** `notificaciones-service` envía por el SMTP real de Gmail con las credenciales en `.env.local` (gitignorado), o por el SMTP de demostración **Mailpit** sin credenciales para probar el flujo completo sin una bandeja real. La receta de ambas rutas está en el README de `notificaciones-service`; sin `MAIL_HOST` el servicio guarda la notificación como `PENDIENTE` y no envía.
- **Flujo de pedido (checkout):** el cliente elige sus delicias en el catálogo (carrito compartido con cantidades editables) y `/pedido` es la revisión y confirmación: cada fila muestra foto, nombre, precio unitario (c/u), cantidad y subtotal —la cantidad se ajusta con botones **`−` y `+`**, igual que en el mini carrito, y no con el input numérico del navegador—; el resumen jerarquiza subtotal, descuentos y **total final** destacado. Un botón abre una **ventanita del catálogo** para seguir agregando delicias sin salir del checkout: esa ventanita **marca con el badge `-10% hoy` la tarjeta de la delicia del día** (solo el backend confirma cuál es), **elige la cantidad con los mismos botones `−` y `+`** y, como su lista tiene scroll propio, trae **su propio botón de volver arriba** — el flotante de la página mueve la ventana y al panel del catálogo no le hace nada. Si el carrito está vacío se invita al catálogo. Al registrar, el modal muestra el **código de seguimiento** (UUID de 32 caracteres). Los ids secuenciales no se exponen (protección IDOR).
- **Consulta de estado renovada:** `/estado` muestra el pedido con línea de avance de las 4 etapas (Recibido → En preparación → Despachado → Entregado, con la actual destacada), ficha de cliente y fecha en dos columnas, productos en filas con **foto del catálogo**, cantidad y subtotal, y resumen con descuento en verde y **total final** destacado, en el mismo lenguaje visual del checkout. El pedido solo persiste nombre, cantidad y precio: la foto se resuelve contra el catálogo por nombre y, si el producto ya no existe, la fila va sin foto en vez de con una imagen rota.
- **Toast de carrito:** al agregar una delicia desde Home, el catálogo o la ventanita del pedido aparece un aviso compacto arriba (el mismo SweetAlert2 de la confirmación de compra) con el cuadrito del producto y su nombre en rosa; se cierra solo a los 3 segundos o a mano con la X, en lugar del antiguo "✓ Agregado" en la tarjeta.
- **Confirmación honesta:** el aviso de "¡Pedido registrado!" y el resumen de `/estado` nombran cada descuento según lo que aplicó el backend (bienvenida, Delicia del Día o ambos) y ya no muestran el número interno del pedido: para eso está el código de seguimiento.
- **Fecha y hora local:** la página `/estado` muestra la fecha del pedido convertida a la zona horaria de Chile (`America/Santiago`), no la hora del servidor UTC: el backend envía el instante en UTC con sufijo `Z` y el navegador lo convierte a la hora local.
- **Correo con detalle:** el email de confirmación incluye cada producto con su cantidad (ej: `Selva Negra x2, Manjar Nuez x8`), total de artículos y monto.
- **Código de bienvenida:** el primer inicio de sesión de un cliente con Google registra la primera conexión y entrega el código `BIENVENIDO10` (en `localStorage`, para habilitar el ahorro en vivo). Un banner en el Home lo muestra y el cliente lo **escribe a mano** en `/pedido`: **el campo nunca viene prellenado**, de modo que nadie recibe un código que no pidió y un cliente que ya lo usó no arranca con un error provocado por un código puesto solo. La marca local se consume al confirmar. El **uso único lo decide la base de datos por email**: el backend rechaza el doble canje aunque el cliente entre desde otro navegador, y el código escrito a mano viaja al backend aunque el navegador no tenga la marca local. **Antes de prometer el código, el Home confirma su elegibilidad con el backend** (`GET /api/pedidos/bienvenida/estado?email=...`): si ese email ya lo canjeó (o el backend no responde), no se muestra el banner y se limpia la marca local, para no ofrecer un código que sería rechazado. El backend persiste `subtotal`, `descuento` y `total` con **-10%** (ver README de `pedidos-service`).

## Desarrollo local (v3)

- **Home renovado:** hero de bienvenida, una *Delicia del Día* y tres *Favoritos de la Casa*, cada uno con su propio botón de alta al carrito y selector de cantidad. La delicia la define el backend (`GET /api/productos/delicia-del-dia`: el mismo producto para todos en un mismo día) y su tarjeta muestra el badge **-10% hoy**; los favoritos se sortean al azar excluyendo ese producto. Si el endpoint no responde, la delicia vuelve a la selección aleatoria de siempre, sin badge, y se usan productos de respaldo para que la página nunca quede vacía. Un único botón del hero lleva al catálogo.
- **Animaciones con accesibilidad:** el Home y el catálogo tienen **entradas al hacer scroll** (cada sección aparece con fade y deslizamiento mediante `IntersectionObserver`, en el componente reutilizable `Revelar`) y el hero se anima al cargar: **gradiente que respira** y título, subtítulo y botón con **entrada escalonada**. Todo respeta `prefers-reduced-motion`: si el navegador no soporta `IntersectionObserver`, si el sistema pide menos movimiento o si el observer fallara, el contenido queda visible de entrada (con un respaldo por tiempo), de modo que ninguna sección puede quedarse invisible. Cubierto con pruebas propias (`tests/Revelar.spec.jsx`).
- **Fondos de página con fotos propias:** todas las páginas —Inicio, Delicias, Historia, Pedido, Estado, Contacto, Login y también el acceso y el panel de administración— usan `fondoPagina.jpeg` (en `src/assets/img/`) cubriendo **toda la pantalla** con `cover` y un velo que suaviza la foto bajo el contenido (según el mockup `ejemploPagina.jpeg`), vía un pseudo-elemento `::before` fijo al viewport en la clase `fondo-pagina` (cubierto por `tests/FondosPagina.spec.jsx`). `fondoHistoria.jpeg` queda solo como fondo de la cita de cierre de /historia.
- **Pills de navegación del catálogo:** en Delicias, bajo el título, cada sección visible tiene su "pill" (botón redondo) que queda pegado arriba al hacer scroll (`position: sticky`) y lleva a su sección con scroll suave respetando `prefers-reduced-motion`. Son anclas, no filtros: las pills salen del mismo arreglo de secciones que se renderizan y apuntan a un `id` derivado del título (cubierto por `tests/DeliciasPills.spec.jsx`).
- **Nuestra historia:** el sitio tiene su propia página *Nuestra historia* (`/historia`, con link en el navbar entre Delicias y Pedido) —"Sueños que se hornean en casa"— en tres bloques: **El origen de un sueño** (cómo My Dreams nació del sueño de Catherine), **El sabor de lo hecho en casa** (Andrés y la cocina de la casa) y **Detrás de nuestra web** (Catherine y Matías). El copy es el escrito por Cathi y sigue la decisión de mostrar **los nombres reales de la familia sí y las escuelas del curso no**, para que el sitio se lea como un negocio real y no como un trabajo de clase: el contenido está fijado por test (`tests/Historia.spec.jsx`), incluida la ausencia de `Duoc`/`Inacap`. Los bloques entran con la misma animación de scroll del resto del sitio y se elevan al pasar el mouse. La página cierra con la cita **Un sueño que compartimos en familia** ("My Dreams nació de un sueño, crece en familia y está hecho con cariño.") presentada sobre la foto del pastel, con copy también aprobado y fijado por test. Las tarjetas son semitransparentes para dejar ver la foto de fondo.
- **Botón volver arriba:** aparece flotante abajo a la derecha al bajar más de 300 px y vuelve al inicio con scroll suave; está presente en todas las páginas.
- **Favicon:** la pestaña del navegador muestra el logo de la pastelería (`/img/logoPasteleria.png`).
- **Catálogo público:** `/delicias` se puede consultar sin iniciar sesión. El login solo se pide al finalizar el pedido. La tarjeta de la *Delicia del Día* también lleva el badge **-10% hoy** flotando sobre su imagen en el catálogo (mismo producto que anuncia el backend en el Home).
- **Login separado admin/cliente:** los accesos ya no comparten página. `/login` es solo de clientes con Google OAuth (conserva el retorno `?redirect=` del teaser); `/admin/login` es el formulario de administrador (bypass local `admin/admin123`, e intento a `POST /api/auth/login`). `/admin` exige una sesión con `userRole=admin`: un cliente con Google (o una sesión antigua sin rol) no entra aunque tenga token. El link "⚙️ Admin" del header solo aparece con sesión de administrador. Siguiendo la práctica profesional de consolas administrativas (la puerta de admin no se anuncia en la navegación principal), el acceso visible es un enlace discreto "Panel de administración" en el footer. Se eliminó el usuario demo `cliente`/`cliente123` (el acceso de cliente es Google, configurado en `.env`).
- **Carrito compartido:** `CarritoContext` es la única fuente de verdad del carrito. Delicias, el mini carrito y el formulario de pedido leen del mismo contexto, así el pedido nace ya poblado con lo que el cliente eligió.
- **Mini carrito:** panel lateral que se abre desde el ícono del header, con miniatura del producto, contador de cantidad, subtotal, total, vaciar carrito e ir al pedido.
- **Selector de cantidad:** al agregar un producto desde el catálogo se abre un modal con botones `−` y `+` para elegir cuántas unidades llevar.
- **Descuento de la delicia del día:** si el carrito incluye la delicia (coincidencia por nombre), el resumen del pedido estima el **-10% sobre todo el pedido**, acumulable al `BIENVENIDO10`. El monto final lo aplica el backend (fuente real en la confirmación del pedido).
- **Teaser de pedido:** el invitado que llega a `/pedido` sin sesión ve por qué conectarse; si nunca inició sesión se le invita a *reclamar su código de bienvenida* (el código es de un solo uso por email).
- **Proxy local:** `vite.config.js` enruta `/api/productos` → `:8080`, `/api/pedidos` → `:8082` y `/api/estadisticas` → `:8081`. El catálogo se sirve desde `catalogo-service` en local; apunta a MySQL local con las variables `DB_URL`, `DB_USER` y `DB_PASS` (ver `.env.example` de cada microservicio).
