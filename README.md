# Studdy

App web de estudio con IA: subes tus apuntes y obtienes esquemas, flashcards,
exámenes y presentaciones escritos para tu nivel exacto, además de un chat que
ya conoce tu curso y tus asignaturas.

- **Frontend**: HTML, CSS y JavaScript planos. Sin frameworks, sin bundler, sin
  paso de compilación.
- **Backend**: Supabase (Postgres + Auth), con RLS activado en todas las tablas.
- **IA**: API de Anthropic (Claude), a través de una función serverless.
- **Deploy**: Netlify.

---

## 1. Qué hay que configurar antes de que funcione

Son tres cosas. Sin ellas la app carga pero no puede guardar ni generar nada.

### a) Variables de entorno en Netlify

En **Netlify → Site configuration → Environment variables**:

| Variable | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys |

Ninguna de las tres está escrita en el código. El navegador recibe las dos de
Supabase desde `/api/config`, y la de Anthropic no sale nunca del servidor.

### b) El esquema de base de datos

En **Supabase → SQL Editor → New query**, pega el contenido de
[`supabase/schema.sql`](supabase/schema.sql) y ejecútalo. Crea las siete tablas,
activa RLS en todas y añade las políticas.

### c) Sesiones anónimas

En **Supabase → Authentication → Providers → Anonymous sign-ins**, actívalo.

Es lo que hace que el botón "Entrar" funcione. La pantalla de acceso no pide
email ni contraseña, pero por detrás abre una sesión anónima de Supabase, y de
ahí sale el `auth.uid()` real que necesitan las políticas RLS para que cada
usuario solo pueda ver y editar sus propios datos. Sin esto, o no habría
aislamiento entre usuarios, o las políticas bloquearían todas las operaciones.

Cuando más adelante quieras login de verdad (email, Google…), las cuentas
anónimas se pueden convertir en permanentes sin perder los datos ya guardados.

---

## 2. Estructura

```
index.html            Landing pública
login.html            Acceso: un único botón
onboarding.html       Formulario de 4 pasos
app.html              Aplicación (dashboard y secciones)

css/
  base.css            Tokens de diseño, reset y componentes comunes
  landing.css         Landing, incluido el objeto 3D del hero
  forms.css           Login y onboarding
  app.css             Aplicación

js/
  core.js             Config, sesión, llamadas a la IA y utilidades
  login.js            Pantalla de acceso
  onboarding.js       Los 4 pasos y el guardado del perfil
  app.js              Estado, carga de datos y enrutador por hash
  views/
    notes.js          Dashboard, subida de apuntes y esquema
    flashcards.js     Generación y repaso de tarjetas
    exams.js          Generación, respuesta y corrección
    chat.js           Chat con la IA
    presentations.js  Generación y carrusel de diapositivas

netlify/functions/
  config.js           Entrega la configuración pública de Supabase
  ai.js               Proxy hacia la API de Anthropic

supabase/schema.sql   Tablas, RLS y políticas
netlify.toml          Publicación, redirecciones /api/* y cabeceras
```

---

## 3. Cómo se protegen las credenciales

El repositorio es público, así que nada sensible vive en él.

- `SUPABASE_URL` y `SUPABASE_ANON_KEY` las sirve `/api/config` en tiempo de
  ejecución, leyéndolas del entorno de Netlify. No aparecen en ningún `.html`
  ni `.js` del repositorio.
- `ANTHROPIC_API_KEY` no llega nunca al navegador. El frontend llama a
  `/api/ai`, y es esa función la que habla con Anthropic.
- Antes de gastar una llamada a la IA, `/api/ai` comprueba contra Supabase que
  quien la pide tiene una sesión válida, y aprovecha esa misma comprobación
  para leer su perfil. Así el nivel académico con el que se adapta cada
  generación sale del perfil real del usuario y no de lo que diga el cliente.
- `.env` está en `.gitignore`. Para desarrollo local, copia `.env.example` a
  `.env` y usa `netlify dev`.

---

## 4. Cómo la IA se adapta al nivel

`netlify/functions/ai.js` construye la instrucción de sistema a partir del
perfil guardado: nivel, curso, rama o familia profesional, carrera y la lista
de asignaturas. A partir de ahí ajusta vocabulario, profundidad y extensión,
de forma que un esquema de 1º de la ESO no se parezca a uno de 2º de
Bachillerato ni a uno de un Grado Superior.

Las salidas con estructura (flashcards, exámenes y presentaciones) se piden a
Claude mediante herramientas con esquema JSON, de modo que el formato es
siempre el esperado y no hay que analizar texto libre.

Modelo en uso: `claude-sonnet-5`. Se cambia en la constante `MODEL` de
`netlify/functions/ai.js`.

---

## 5. Base de datos

| Tabla | Contenido |
|---|---|
| `profiles` | Nombre y datos académicos. `id` es el `auth.uid()` del usuario. |
| `subjects` | Asignaturas o módulos añadidos en el onboarding. |
| `notes` | Apuntes subidos (texto extraído del PDF o pegado a mano). |
| `summaries` | Esquemas generados por la IA. |
| `flashcards` | Preguntas y respuestas. |
| `exams` | Preguntas del examen, en `questions_json`. |
| `presentations` | Diapositivas, en `content_json`. |

Las siete tienen RLS activado y políticas de `select`, `insert`, `update` y
`delete` restringidas al propietario.

**Una nota sobre `presentations`:** además de `note_id` lleva `profile_id`, y
`note_id` admite nulos. Es porque una presentación se puede generar escribiendo
un tema directamente, sin partir de ningún apunte; en ese caso no habría de
dónde deducir el propietario y RLS no podría protegerla.

---

## 6. Desarrollo local

```bash
npm install -g netlify-cli
cp .env.example .env      # y rellena las tres variables
netlify dev
```

`netlify dev` es necesario porque un servidor estático a secas no sirve las
rutas `/api/config` y `/api/ai`, y sin ellas la app no arranca.

---

## 7. Deploy en Netlify

1. Conecta el repositorio en Netlify.
2. Build command: vacío. Publish directory: `.` (ya está en `netlify.toml`).
3. Añade las tres variables de entorno del punto 1.
4. Deploy.

---

## 8. Librerías externas

Se cargan por `<script>` desde CDN. No hay npm ni `node_modules` en el proyecto.

- [`@supabase/supabase-js`](https://github.com/supabase/supabase-js) 2.45.4 —
  cliente de base de datos y sesión.
- [`pdf.js`](https://mozilla.github.io/pdf.js/) 3.11.174 — extrae el texto de
  los PDF en el propio navegador.

Los PDF escaneados (páginas que son imágenes) no contienen texto extraíble; en
ese caso la app lo dice y sugiere pegar el texto a mano.
