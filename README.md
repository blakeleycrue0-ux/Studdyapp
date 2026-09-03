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

### c) Métodos de acceso

En **Supabase → Authentication → Providers**:

- **Email**: viene activado. Decide en sus opciones si exiges confirmar el
  correo antes de entrar; la app contempla los dos casos.
- **Google**: hay que darle un Client ID y un Client Secret. Se sacan de
  Google Cloud Console → APIs y servicios → Credenciales → Crear ID de cliente
  de OAuth → Aplicación web, poniendo como URI de redirección autorizada
  `https://<tu-ref>.supabase.co/auth/v1/callback`.

Y en **Supabase → Authentication → URL Configuration**:

- **Site URL**: la del sitio publicado, por ejemplo `https://studyapp15.netlify.app`
- **Redirect URLs**: añade `https://studyapp15.netlify.app/login.html`

Sin esa segunda parte, Google y los correos de recuperación te devolverían a
`localhost` en lugar de a tu app.

**Si vienes de la versión con botón único:** aquellas sesiones eran anónimas.
La pantalla de acceso las detecta, avisa de que hay apuntes guardados en ese
dispositivo y, al crear la cuenta, enlaza esa misma sesión en vez de abrir una
nueva, así que no se pierde nada. Para poder enlazarla con Google hace falta
activar **Manual linking** en Authentication → Settings.

---

## 2. Estructura

Móvil primero: barra de navegación abajo con cinco destinos —Inicio, Apuntes,
Repasar, Chat y Perfil— y contenido en una sola columna.

El **onboarding** va de una pregunta por pantalla, con pantallas intercaladas
que no piden nada: la bienvenida, un resumen de lo que va a poder hacer, la
curva de su objetivo y la preparación final. Pregunta el nombre, el nivel y lo
que cuelgue de él, las asignaturas, por qué nota va, a cuál quiere llegar y
cuántos días a la semana va a estudiar. Con los dos últimos datos calcula una
fecha estimada y dibuja la curva; la pantalla avisa de que es una estimación y
no una promesa. Ningún campo arranca con valor.

Cada apunte funciona como un **cuaderno**: dentro están su esquema, sus
flashcards, su examen, su presentación y un chat sobre ese apunte concreto, en
pestañas. El contenido se acumula alrededor del apunte en lugar de repartirse
por secciones sueltas.

```
index.html            Landing pública
login.html            Acceso con correo o con Google
onboarding.html       El recorrido de bienvenida
app.html              Aplicación (armazón + barra inferior)

css/
  base.css            Tokens de diseño, reset, componentes y gráficas
  landing.css         Landing, el objeto 3D del hero y las reseñas
  forms.css           Login y onboarding
  app.css             Aplicación, diapositivas y hoja de impresión

js/
  core.js             Config, sesión, llamadas a la IA y utilidades
  icons.js            Iconos compartidos
  charts.js           Gráficas en SVG: curva, barras y series
  data/fp.js          Las 26 familias de FP y sus ciclos formativos
  landing.js          Demos y carrusel de reseñas de la landing
  login.js            Pantalla de acceso
  onboarding.js       Las pantallas de bienvenida y el guardado del perfil
  app.js              Estado, carga de datos y enrutador por hash
  views/
    home.js           Inicio: agenda, objetivo, gráficas y herramientas
    notes.js          Lista de apuntes con filtro, y subida
    notebook.js       El cuaderno: pestañas del apunte y esquema
    flashcards.js     Generación y repaso dentro de un apunte
    exams.js          Generación, respuesta, corrección y resultado
    presentations.js  Diapositivas con diseño y exportación
    review.js         Repaso espaciado entre todos los apuntes
    agenda.js         Exámenes, entregas y fechas
    exercises.js      Ejercicios resueltos paso a paso, con foto
    writing.js        Trabajos: guion, borrador y revisión
    chat.js           Chat general y chat sobre un apunte
    profile.js        Datos del perfil y cierre de sesión

netlify/functions/
  config.js           Entrega la configuración pública de Supabase
  ai.js               Proxy hacia la API de Anthropic

supabase/
  schema.sql                   Instalación completa
  migracion-01-intentos.sql    Solo exam_attempts
  migracion-02-funciones.sql   Agenda, repaso, ejercicios y trabajos
  migracion-03-objetivo.sql    El objetivo de nota del onboarding
netlify.toml          Publicación, redirecciones /api/* y cabeceras
```

### Las reseñas de la landing son ejemplos

La sección «Reseñas» de `index.html` se pinta desde la constante `RESENAS` de
`js/landing.js`. Studdy todavía no tiene usuarios, así que ahí no hay
opiniones reales: son fichas de muestra y por eso cada una lleva la etiqueta
«Ejemplo» y la sección lo advierte encima. Es lo que evita que alguien las lea
como opiniones de personas de verdad, que además es lo que exige la
[Directiva (UE) 2019/2161](https://eur-lex.europa.eu/eli/dir/2019/2161/oj)
sobre reseñas de consumidores.

Cuando haya reseñas reales: sustituye esa lista por las suyas, quita el
`review__tag` de la tarjeta en `pintarResenas()` y cambia el párrafo de aviso
de la sección `#resenas` en `index.html`.

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

Acciones disponibles en `/api/ai`: `summary`, `flashcards`, `exam`,
`presentation`, `chat`, `exercise` (acepta una foto del ejercicio además del
enunciado) y `writing` (guion, borrador o revisión de un trabajo).

Modelo en uso: `claude-sonnet-5`. Se cambia en la constante `MODEL` de
`netlify/functions/ai.js`.

---

## 5. Base de datos

| Tabla | Contenido |
|---|---|
| `profiles` | Nombre, datos académicos y el objetivo de nota. `id` es el `auth.uid()` del usuario. |
| `subjects` | Asignaturas o módulos añadidos en el onboarding. |
| `notes` | Apuntes subidos (texto extraído del PDF o pegado a mano). |
| `summaries` | Esquemas generados por la IA. |
| `flashcards` | Preguntas y respuestas. |
| `exams` | Preguntas del examen, en `questions_json`. |
| `presentations` | Diapositivas, en `content_json`. |
| `exam_attempts` | Resultado de cada examen corregido. Alimenta el porcentaje de aciertos del Inicio. |
| `events` | Exámenes, entregas y otras fechas de la agenda. |
| `card_reviews` | Estado de repaso espaciado de cada flashcard. |
| `exercises` | Ejercicios resueltos paso a paso. |
| `documents` | Trabajos y redacciones. |

Todas tienen RLS activado y políticas de `select`, `insert`, `update` y
`delete` restringidas al propietario.

**Las tablas de las migraciones son opcionales.** Si no existen, la app funciona
igual y solo se oculta lo que dependa de ellas: sin `exam_attempts` no hay
porcentaje de aciertos, sin las de la migración 02 no hay agenda, repaso
espaciado, ejercicios ni trabajos, y sin las columnas de la migración 03 el
onboarding guarda el perfil sin el objetivo y el Inicio no enseña la curva.
Para añadirlas a una base ya creada, ejecuta las tres por orden:
`supabase/migracion-01-intentos.sql`, `supabase/migracion-02-funciones.sql` y
`supabase/migracion-03-objetivo.sql`.

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
