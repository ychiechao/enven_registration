export async function onRequestGet({ env }) {
  try {
    const [settingsRaw, countRaw, formSchemaRaw] = await Promise.all([
      env.KV.get('settings'),
      env.KV.get('count'),
      env.KV.get('form_schema'),
    ]);

    const settings = settingsRaw ? JSON.parse(settingsRaw) : { isOpen: false, limit: 30 };
    const count = countRaw ? parseInt(countRaw, 10) : 0;
    const formSchema = formSchemaRaw ? JSON.parse(formSchemaRaw) : [];

    return new Response(
      JSON.stringify({ isOpen: settings.isOpen, limit: settings.limit, count, formSchema }),
      { headers: corsHeaders(env) }
    );
  } catch (e) {
    return errorResponse(500, e.message);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function corsHeaders(env) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  };
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}
