import { corsHeaders, errorResponse, requireAdmin, getGoogleToken } from '../../_shared/utils.js';

export async function onRequestPost({ request, env }) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  try {
    const { formId } = await request.json();
    if (!formId) return errorResponse(400, '請提供 formId');

    const token = await getGoogleToken(env);
    const formsRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!formsRes.ok) {
      const errText = await formsRes.text();
      return errorResponse(500, `讀取 Google Form 失敗: ${errText}`);
    }

    const form = await formsRes.json();
    const schema = parseFormItems(form.items || []);

    await env.KV.put('form_schema', JSON.stringify(schema));

    // Update Google Sheets header row
    await updateSheetHeader(env, token, schema);

    return new Response(JSON.stringify({ ok: true, schema }), {
      headers: corsHeaders(env),
    });
  } catch (e) {
    return errorResponse(500, e.message);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function parseFormItems(items) {
  const schema = [];
  for (const item of items) {
    if (!item.questionItem) continue;
    const q = item.questionItem.question;
    const entry = {
      id: item.itemId,
      title: item.title,
      required: q.required || false,
      type: 'TEXT',
      options: undefined,
    };

    if (q.choiceQuestion) {
      const ct = q.choiceQuestion.type;
      entry.type = ct === 'CHECKBOX' ? 'CHECKBOX' : 'RADIO';
      entry.options = q.choiceQuestion.options.map((o) => o.value);
    } else if (q.scaleQuestion) {
      entry.type = 'SCALE';
      entry.min = q.scaleQuestion.low;
      entry.max = q.scaleQuestion.high;
    } else if (q.textQuestion) {
      entry.type = q.textQuestion.paragraph ? 'TEXTAREA' : 'TEXT';
    }

    schema.push(entry);
  }
  return schema;
}

async function updateSheetHeader(env, token, schema) {
  const sheetId = env.GOOGLE_SHEET_ID;
  const headers = ['時間戳記', 'Email', ...schema.map((f) => f.title)];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1?valueInputOption=RAW`;

  await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [headers] }),
  });
}
