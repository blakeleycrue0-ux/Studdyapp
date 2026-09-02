// Entrega al navegador la configuración pública de Supabase leyéndola de las
// variables de entorno de Netlify. Así SUPABASE_URL y SUPABASE_ANON_KEY nunca
// aparecen escritas en el HTML/JS que se sube al repositorio.

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Método no permitido' });
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return json(500, {
      error:
        'Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_ANON_KEY en Netlify.',
    });
  }

  return json(200, { supabaseUrl: url, supabaseAnonKey: anonKey });
};

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
