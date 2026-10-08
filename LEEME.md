# IRON PANTHERS

**Para esta actualización empieza por EMPIEZA-AQUI.md.**

Sitio completo con portal de socios y panel administrativo, preparado para Vercel.

El proyecto incluye el portal público y el panel de recepción.

## Primero: verlo desde tu celular

1. Descomprime `IRON-FAMILY-proyecto.zip`.
2. Crea un repositorio en GitHub y sube **el contenido de la carpeta `iron-family`**. `package.json`, `index.html`, `api`, `src` y `public` deben estar en la raíz del repositorio. Incluye también `package-lock.json` y `vercel.json`.
3. En [Vercel](https://vercel.com/new), elige **Add New → Project**, importa ese repositorio y pulsa **Deploy**. Vercel debe detectar **Vite**.
4. Abre el enlace que entrega Vercel en tu celular. Administración se abre directamente en `/admin.html`; no tiene enlace público.

Si solicita la configuración:

| Campo | Valor |
|---|---|
| Framework preset | Vite |
| Root Directory | La carpeta que contiene `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22.12 o superior; recomendado 24 |

**Vercel importa el proyecto desde un repositorio; no subas el ZIP como si fuera la página.** No necesitas activar una base de datos para ver el diseño y probar sus funciones.

### Prueba rápida

- En **Mi membresía**, escribe **Alex Hernández**.
- En **Administración**, pulsa **Explorar administración**.
- Registra un socio, copia su nombre completo desde su ficha y consúltalo en el portal del **mismo navegador**.
- Prueba las flechas del carrusel, las pestañas de sabor y los dos tamaños. En celular también puedes deslizar la imagen.

## Dos formas de usarlo

### Demostración (funciona al subirlo)

Sin variables de entorno, el sitio utiliza seis socios ficticios y guarda cambios en el navegador. Cada dispositivo tiene su propia demostración. No uses datos personales reales en este modo. El sitio lo indica en administración y en la consulta.

### Membresías reales compartidas

La conexión ya está implementada: Vercel ejecuta el servidor y Supabase guarda los registros. Requiere tu propia cuenta y configurar los siguientes pasos. No hay una base de datos externa creada ni credenciales incluidas en el ZIP.

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre **SQL Editor**, pega el contenido completo de `database.sql` y ejecútalo una sola vez. Se crean las tablas, restricciones de acceso y límites de intentos. La base inicia vacía.
3. Obtén la URL del proyecto y la clave de servidor `service_role` en los ajustes de API del proyecto. Mantén esta clave privada.
4. En tu proyecto de Vercel, ve a **Settings → Environment Variables** y agrega **las cinco** variables:

| Variable | Qué escribir |
|---|---|
| `SUPABASE_URL` | URL HTTPS de tu proyecto, por ejemplo `https://tu-proyecto.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave privada de servidor del proyecto |
| `ADMIN_USER` | Tu nombre de usuario administrativo |
| `ADMIN_PASSWORD` | Una contraseña propia, de al menos 12 caracteres |
| `SESSION_SECRET` | Una cadena aleatoria de al menos 32 caracteres |

Para generar el secreto, ejecuta en una terminal con Node instalado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Activa las variables en los entornos de Vercel donde las usarás y vuelve a desplegar (**Deployments → Redeploy**).
6. Abre administración, entra con tus credenciales y registra a tus socios. Cada uno consulta con su nombre completo; su ficha tiene **Copiar acceso**.
7. Comprueba desde otro dispositivo que la consulta devuelve la membresía registrada.

El modo en línea se activa solo con la configuración completa. Una configuración parcial muestra un error; nunca cambia silenciosamente a datos ficticios. Las variables privadas no llevan prefijo `VITE_` y no se incorporan al código del navegador.

Las sesiones administrativas duran ocho horas, usan cookies HttpOnly y los intentos de acceso y consulta tienen límites persistentes. Las tablas no permiten lectura pública directa. El portal recibe únicamente los datos de la membresía solicitada.

## Funciones incluidas

- Identidad IRON FAMILY en portal y administración, con títulos desgastados inspirados en tu referencia.
- Portada con pantera, movimiento suave, transiciones al desplazarte y compatibilidad con «reducir movimiento».
- Selección de Iron Gym o Iron Cross con vista ampliada de cada modalidad.
- Malteadas de **chocolate, fresa, vainilla, galleta y capuchino**: chica **$25 MXN**, grande **$35 MXN**, con manzana o plátano.
- Preentrenos **$35 MXN por preparación**: RYSE, Kaioken, Essential y Psychotic Xtreme. La disponibilidad de sabores se consulta en recepción.
- Consulta de membresía con fecha de inicio, vencimiento, días restantes y estado.
- Registro, búsqueda, filtros, edición, ficha, renovación y eliminación de socios.
- Duraciones de 1, 3, 6 y 12 meses naturales. El último día indicado sigue vigente; se marca vencida al día siguiente. Fechas y estados usan el día de Ciudad de México.
- Pagos y renovaciones mantiene un historial privado de cobros recibidos y actualiza la vigencia. Propone extender el periodo vigente sin perder días pendientes. No realiza cobros bancarios.
- Logos discretos de Visa, Mastercard, Carnet, American Express y Mercado Pago. Son métodos aceptados **en recepción**; no hay cobro en línea ni pasarela integrada.
- Fotografías y fuentes incluidas localmente para evitar depender de enlaces de imágenes al visitar el sitio.

## Personalizar contenido

| Qué quieres cambiar | Archivo |
|---|---|
| Títulos, texto, precios y marcas de preentrenos | `index.html` |
| Sabores, descripciones y contenido de las modalidades | `src/main.js` |
| Colores, tamaños y animaciones | `src/style.css` |
| Panel administrativo | `src/admin.js` y `src/admin.css` |
| Pesa de bienvenida | `public/assets/hero-panther.png` |
| Fotos de Gym y Cross | `public/assets/gym.jpg` y `cross.jpg` |
| Fotografía de coaches | `public/assets/coaches-panthers.png` |
| Imagen del carrusel de malteadas | `public/assets/shakes.webp` |

La imagen de malteadas es una composición de cinco vasos, en el orden de sabores del carrusel. El código muestra cada quinto de la imagen y mantiene la proporción del vaso.

Las instalaciones son fotografías ilustrativas de stock; coaches, pesa y bebidas son imágenes generadas. Sustituye las fotos de instalaciones y coaches por las reales cuando las tengas y actualiza sus textos alternativos y notas. Las imágenes de bebidas no garantizan la presentación o ingredientes reales. No se inventaron nombres de coaches, horarios, dirección ni contactos.

Para cambiar los precios de malteadas actualiza tanto `index.html` como la selección de tamaño en `src/main.js`.

## Trabajar en tu computadora

Instala Node.js 24 y abre una terminal dentro de `iron-family`:

```bash
npm ci
npm run dev
```

Abre la dirección que aparece en la terminal. Para probar el servidor local con datos reales, copia `.env.example` como `.env.local`, completa las cinco variables y reinicia `npm run dev`. Nunca subas `.env.local` a GitHub.

```bash
npm test
npm run build
```

`npm run dev` incluye la API local. `npm run preview` sirve la compilación visual pero no ejecuta la API de Vercel; úsalo solo para inspeccionar la presentación. Para probar el despliegue completo, usa Vercel o su CLI (`vercel dev`). No abras `index.html` mediante doble clic: el proyecto utiliza módulos y necesita un servidor.

## Alcance de la verificación

Las pruebas incluidas validan vencimientos de fin de mes/años bisiestos, estados, campos inválidos, acceso administrativo, protección de rutas, CRUD y respuesta mínima de consulta mediante un servidor de datos simulado. La integración real con tu cuenta de Supabase debe comprobarse después de configurar las variables; no puede verificarse contra una cuenta aún no conectada.

## Referencias técnicas

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Funciones Node.js de Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Data API de Supabase](https://supabase.com/docs/guides/api)
- [Seguridad por filas de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)

Créditos de imágenes, tipografías y logos en `CREDITOS.md`.
