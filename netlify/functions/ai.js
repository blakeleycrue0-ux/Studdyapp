// Proxy hacia la API de Anthropic (Claude).
//
// Existe por una razón de seguridad: la clave ANTHROPIC_API_KEY nunca puede
// viajar al navegador. El frontend llama a /api/ai y es esta función, ya en el
// servidor de Netlify, la que habla con Anthropic usando la clave del entorno.
//
// Antes de gastar una sola llamada verifica que quien la pide tiene una sesión
// válida de Supabase, y aprovecha esa misma comprobación para leer su perfil
// (RLS garantiza que solo puede leer el suyo). De ahí sale el nivel/curso con
// el que se adapta cada generación.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!apiKey) {
    return json(500, { error: 'Falta la variable de entorno ANTHROPIC_API_KEY en Netlify.' });
  }
  if (!supabaseUrl || !anonKey) {
    return json(500, { error: 'Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en Netlify.' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(401, { error: 'No hay sesión activa.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Cuerpo de la petición inválido.' });
  }

  const { action } = payload;

  let profile;
  try {
    profile = await fetchProfile(supabaseUrl, anonKey, token);
  } catch (err) {
    return json(401, { error: err.message });
  }

  try {
    switch (action) {
      case 'summary':
        return await handleSummary(apiKey, profile, payload);
      case 'flashcards':
        return await handleFlashcards(apiKey, profile, payload);
      case 'exam':
        return await handleExam(apiKey, profile, payload);
      case 'presentation':
        return await handlePresentation(apiKey, profile, payload);
      case 'chat':
        return await handleChat(apiKey, profile, payload);
      default:
        return json(400, { error: 'Acción desconocida.' });
    }
  } catch (err) {
    return json(502, { error: err.message || 'Error al contactar con la IA.' });
  }
};

// ---------------------------------------------------------------------------
// Perfil del usuario (autenticación + contexto en una sola llamada)
// ---------------------------------------------------------------------------

async function fetchProfile(supabaseUrl, anonKey, token) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=*,subjects(name)&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('Sesión no válida o caducada.');
  }
  if (!res.ok) {
    throw new Error('No se ha podido leer el perfil del usuario.');
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Todavía no has completado el onboarding.');
  }
  return rows[0];
}

// Traduce el perfil a una descripción en lenguaje natural del nivel académico,
// que es lo que permite que un esquema de 1º ESO no se parezca a uno de 2º de
// Bachillerato.
function describeProfile(profile) {
  const parts = [];

  switch (profile.level) {
    case 'ESO':
      parts.push(`Cursa ${profile.course || ''} de la ESO (Educación Secundaria Obligatoria, España)`.trim());
      break;
    case 'Bachillerato':
      parts.push(
        `Cursa ${profile.course || ''} de Bachillerato${
          profile.branch ? ` en la rama de ${profile.branch}` : ''
        } (España)`.trim()
      );
      break;
    case 'FP':
      parts.push(
        `Cursa Formación Profesional de Grado ${profile.fp_grade || ''}${
          profile.fp_family ? `, familia profesional de ${profile.fp_family}` : ''
        }${profile.fp_cycle ? `, ciclo formativo de ${profile.fp_cycle}` : ''} (España)`.trim()
      );
      break;
    case 'Universidad':
      parts.push(
        `Estudia ${profile.university_degree || 'una carrera universitaria'}${
          profile.course ? `, ${profile.course} curso` : ''
        } (España)`.trim()
      );
      break;
    default:
      parts.push('Estudiante en España');
  }

  const subjects = (profile.subjects || []).map((s) => s.name).filter(Boolean);
  if (subjects.length) {
    parts.push(`Sus asignaturas o módulos son: ${subjects.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

function levelGuidance(profile) {
  const context = describeProfile(profile);
  return [
    `Te diriges a un estudiante llamado ${profile.name}. ${context}`,
    'Adapta SIEMPRE el vocabulario, la profundidad conceptual y la longitud a ese nivel exacto:',
    '- En ESO: frases cortas, lenguaje sencillo, ejemplos concretos y cotidianos, sin tecnicismos innecesarios.',
    '- En Bachillerato: rigor y terminología propia de la materia, relaciones entre conceptos, nivel de selectividad.',
    '- En FP: enfoque práctico y profesional, orientado a las competencias del ciclo y a su aplicación en el puesto de trabajo.',
    '- En Universidad: precisión académica, matices, terminología especializada y visión crítica.',
    'Responde siempre en español de España.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Llamadas a Anthropic
// ---------------------------------------------------------------------------

async function callClaude({ apiKey, system, messages, maxTokens, tool }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  };

  if (tool) {
    body.tools = [tool];
    body.tool_choice = { type: 'tool', name: tool.name };
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    let message = `La IA ha devuelto un error (${res.status}).`;
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      /* se queda el mensaje genérico */
    }
    throw new Error(message);
  }

  const data = await res.json();

  if (tool) {
    const block = (data.content || []).find((c) => c.type === 'tool_use');
    if (!block) throw new Error('La IA no ha devuelto un resultado con el formato esperado.');
    return block.input;
  }

  return (data.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim();
}

// Tope de texto que se manda a la IA. Un PDF muy largo se recorta aquí en
// lugar de reventar el límite de tokens del modelo; el apunte completo sigue
// guardado íntegro en la base de datos.
const MAX_CHARS = 40000;

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Falta el contenido necesario (${field}).`);
  }
  return value.trim().slice(0, MAX_CHARS);
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

async function handleSummary(apiKey, profile, payload) {
  const content = requireText(payload.content, 'apunte');
  const subject = typeof payload.subject === 'string' ? payload.subject : '';

  const system = [
    levelGuidance(profile),
    '',
    'Tu tarea: convertir los apuntes que te dan en un ESQUEMA de estudio claro y jerárquico.',
    'Formato de salida en Markdown sencillo:',
    '- Un título `# ` con el tema principal.',
    '- Secciones `## ` para cada bloque importante.',
    '- Bajo cada sección, puntos con `- ` y, si hace falta, subpuntos indentados.',
    '- Resalta los términos clave con **negrita**.',
    '- Cierra con una sección `## Ideas clave` con 3 a 6 puntos de repaso rápido.',
    'No inventes información que no esté en los apuntes. No añadas comentarios sobre tu propia tarea.',
  ].join('\n');

  const userText = [
    subject ? `Asignatura: ${subject}` : null,
    'Apuntes:',
    '---',
    content,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const text = await callClaude({
    apiKey,
    system,
    maxTokens: 4000,
    messages: [{ role: 'user', content: userText }],
  });

  return json(200, { summary: text });
}

async function handleFlashcards(apiKey, profile, payload) {
  const content = requireText(payload.content, 'apunte');
  const count = clamp(parseInt(payload.count, 10) || 10, 4, 20);

  const system = [
    levelGuidance(profile),
    '',
    `Tu tarea: crear ${count} flashcards de repaso a partir de los apuntes.`,
    'Cada flashcard es una pregunta breve y directa con su respuesta.',
    'La pregunta debe poder responderse de memoria; la respuesta debe ser concisa (1-3 frases).',
    'Cubre los conceptos más importantes del texto, sin repetir la misma idea dos veces.',
    'No inventes contenido que no esté en los apuntes.',
  ].join('\n');

  const tool = {
    name: 'entregar_flashcards',
    description: 'Entrega la lista de flashcards generadas.',
    input_schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'La pregunta de la tarjeta.' },
              answer: { type: 'string', description: 'La respuesta de la tarjeta.' },
            },
            required: ['question', 'answer'],
          },
        },
      },
      required: ['flashcards'],
    },
  };

  const result = await callClaude({
    apiKey,
    system,
    maxTokens: 4000,
    tool,
    messages: [{ role: 'user', content: `Apuntes:\n---\n${content}\n---` }],
  });

  const flashcards = (result.flashcards || []).filter((f) => f.question && f.answer);
  if (!flashcards.length) throw new Error('La IA no ha podido generar flashcards con este apunte.');

  return json(200, { flashcards });
}

async function handleExam(apiKey, profile, payload) {
  const content = requireText(payload.content, 'apunte');
  const count = clamp(parseInt(payload.count, 10) || 8, 4, 15);

  const system = [
    levelGuidance(profile),
    '',
    `Tu tarea: crear un examen de ${count} preguntas sobre los apuntes, con la dificultad exacta del nivel del estudiante.`,
    'Mezcla dos tipos de pregunta:',
    '- "test": pregunta con exactamente 4 opciones, de las cuales solo una es correcta. Indica el índice (0-3) de la correcta.',
    '- "corta": pregunta de desarrollo corto, con la respuesta esperada en 2-4 frases.',
    'Aproximadamente dos tercios de tipo "test" y un tercio de tipo "corta".',
    'Las opciones incorrectas deben ser verosímiles, no absurdas.',
    'No inventes contenido que no esté en los apuntes.',
  ].join('\n');

  const tool = {
    name: 'entregar_examen',
    description: 'Entrega las preguntas del examen generado.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['test', 'corta'] },
              question: { type: 'string', description: 'El enunciado de la pregunta.' },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Las 4 opciones. Solo para preguntas de tipo "test".',
              },
              correct_option: {
                type: 'integer',
                description: 'Índice 0-3 de la opción correcta. Solo para tipo "test".',
              },
              expected_answer: {
                type: 'string',
                description: 'Respuesta esperada. Solo para preguntas de tipo "corta".',
              },
            },
            required: ['type', 'question'],
          },
        },
      },
      required: ['questions'],
    },
  };

  const result = await callClaude({
    apiKey,
    system,
    maxTokens: 4000,
    tool,
    messages: [{ role: 'user', content: `Apuntes:\n---\n${content}\n---` }],
  });

  const questions = (result.questions || []).filter((q) => {
    if (!q || !q.question) return false;
    if (q.type === 'test') {
      return Array.isArray(q.options) && q.options.length === 4 &&
        Number.isInteger(q.correct_option) && q.correct_option >= 0 && q.correct_option <= 3;
    }
    return q.type === 'corta' && typeof q.expected_answer === 'string';
  });

  if (!questions.length) throw new Error('La IA no ha podido generar un examen con este apunte.');

  return json(200, { questions });
}

async function handlePresentation(apiKey, profile, payload) {
  const source = payload.content ? String(payload.content).trim().slice(0, MAX_CHARS) : '';
  const topic = payload.topic ? String(payload.topic).trim() : '';

  if (!source && !topic) {
    throw new Error('Hace falta un apunte o un tema para generar la presentación.');
  }

  const count = clamp(parseInt(payload.count, 10) || 8, 4, 15);

  const system = [
    levelGuidance(profile),
    '',
    `Tu tarea: crear el contenido de una presentación de ${count} diapositivas.`,
    'La primera diapositiva es la portada: su título es el tema y sus puntos, una frase que sitúe de qué va.',
    'Cada diapositiva siguiente tiene un título claro y entre 3 y 5 puntos clave.',
    'Cada punto es una frase corta y autoexplicativa, no un párrafo.',
    'La última diapositiva es un resumen o conclusión.',
    source
      ? 'Básate únicamente en los apuntes proporcionados, sin inventar contenido.'
      : 'Desarrolla el tema con rigor y ajustado al nivel del estudiante.',
  ].join('\n');

  const tool = {
    name: 'entregar_presentacion',
    description: 'Entrega las diapositivas generadas.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título general de la presentación.' },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Título de la diapositiva.' },
              points: {
                type: 'array',
                items: { type: 'string' },
                description: 'Puntos clave de la diapositiva.',
              },
            },
            required: ['title', 'points'],
          },
        },
      },
      required: ['title', 'slides'],
    },
  };

  const userText = source
    ? `Apuntes:\n---\n${source}\n---`
    : `Tema de la presentación: ${topic}`;

  const result = await callClaude({
    apiKey,
    system,
    maxTokens: 4000,
    tool,
    messages: [{ role: 'user', content: userText }],
  });

  const slides = (result.slides || []).filter((s) => s && s.title && Array.isArray(s.points));
  if (!slides.length) throw new Error('La IA no ha podido generar la presentación.');

  return json(200, { title: result.title || topic, slides });
}

async function handleChat(apiKey, profile, payload) {
  const history = Array.isArray(payload.messages) ? payload.messages : [];

  const messages = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    throw new Error('No hay ningún mensaje que responder.');
  }

  const system = [
    levelGuidance(profile),
    '',
    'Eres el tutor de estudio de este estudiante dentro de la app Studdy.',
    'Explica con claridad, paso a paso, y comprueba que se entiende antes de avanzar.',
    'Si te pregunta por algo de sus asignaturas, conecta la explicación con lo que ya está dando en clase.',
    'Si no sabes algo o te falta contexto, dilo y pregúntale, en lugar de inventarte una respuesta.',
    'Sé breve por defecto: responde en pocos párrafos salvo que te pida más detalle.',
  ].join('\n');

  const text = await callClaude({
    apiKey,
    system,
    maxTokens: 2000,
    messages,
  });

  return json(200, { reply: text });
}

// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}
