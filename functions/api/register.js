import { corsHeaders, errorResponse, requireMethod, getGoogleToken } from '../_shared/utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    // Validate registration is open and not full
    const [settingsRaw, countRaw, emailsRaw, formSchemaRaw] = await Promise.all([
      env.KV.get('settings'),
      env.KV.get('count'),
      env.KV.get('emails'),
      env.KV.get('form_schema'),
    ]);

    const settings = settingsRaw ? JSON.parse(settingsRaw) : { isOpen: false, limit: 30 };
    const count = countRaw ? parseInt(countRaw, 10) : 0;
    const emails = emailsRaw ? JSON.parse(emailsRaw) : {};
    const formSchema = formSchemaRaw ? JSON.parse(formSchemaRaw) : [];

    if (!settings.isOpen) {
      return errorResponse(403, '報名尚未開放');
    }
    if (count >= settings.limit) {
      return errorResponse(403, '名額已滿');
    }

    const email = (body.email || '').toLowerCase().trim();
    if (!email) {
      return errorResponse(400, '請填寫 Email');
    }
    if (emails[email]) {
      return errorResponse(409, '此 Email 已報名，不可重複提交');
    }

    // Build row values based on form_schema order
    const now = new Date().toISOString();
    const rowValues = [now, email];
    for (const field of formSchema) {
      rowValues.push(body[field.id] !== undefined ? String(body[field.id]) : '');
    }

    // Append to Google Sheets
    const token = await getGoogleToken(env);
    const sheetId = env.GOOGLE_SHEET_ID;
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const sheetsRes = await fetch(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [rowValues] }),
    });

    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      return errorResponse(500, `寫入 Sheets 失敗: ${errText}`);
    }

    // Update KV atomically-ish: emails set + count
    emails[email] = true;
    const newCount = count + 1;
    await Promise.all([
      env.KV.put('emails', JSON.stringify(emails)),
      env.KV.put('count', String(newCount)),
    ]);

    return new Response(JSON.stringify({ ok: true, count: newCount }), {
      headers: corsHeaders(env),
    });
  } catch (e) {
    return errorResponse(500, e.message);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
