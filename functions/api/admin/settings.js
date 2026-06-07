import { corsHeaders, errorResponse, requireAdmin } from '../../_shared/utils.js';

export async function onRequestPost({ request, env }) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  try {
    const body = await request.json();
    const settingsRaw = await env.KV.get('settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : { isOpen: false, limit: 30 };

    if (body.isOpen !== undefined) settings.isOpen = Boolean(body.isOpen);
    if (body.limit !== undefined) settings.limit = parseInt(body.limit, 10);

    await env.KV.put('settings', JSON.stringify(settings));

    const countRaw = await env.KV.get('count');
    const count = countRaw ? parseInt(countRaw, 10) : 0;

    return new Response(JSON.stringify({ ok: true, settings, count }), {
      headers: corsHeaders(env),
    });
  } catch (e) {
    return errorResponse(500, e.message);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
