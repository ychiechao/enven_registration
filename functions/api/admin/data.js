import { corsHeaders, errorResponse, requireAdmin, getGoogleToken } from '../../_shared/utils.js';

export async function onRequestGet({ request, env }) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  try {
    const token = await getGoogleToken(env);
    const sheetId = env.GOOGLE_SHEET_ID;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return errorResponse(500, `讀取 Sheets 失敗: ${errText}`);
    }

    const data = await res.json();
    const rows = data.values || [];
    const headers = rows[0] || [];
    const records = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });

    return new Response(JSON.stringify({ headers, records }), {
      headers: corsHeaders(env),
    });
  } catch (e) {
    return errorResponse(500, e.message);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
