// Smoke test dev-only del flujo crear/ver/listar personaje.
// Requiere la app corriendo (npm run start:dev) y el seed aplicado.
// Uso: node scripts/smoke-create-character.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function sampleValue(field) {
  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return 'x';
    case 'TEXTNUMBER':
    case 'COUNTER':
    case 'PROGRESS':
      return 1;
    case 'CHECKBOX':
      return Array.isArray(field.options) && field.options.length
        ? field.options[0]
        : true;
    case 'SELECT':
    case 'RADIO':
      return (field.options || [])[0];
    default:
      return 'x';
  }
}

async function main() {
  // 1) Elegir el primer playbook del seed
  const playbooks = await (await fetch(`${BASE}/playbooks`)).json();
  const pb = playbooks[0];
  if (!pb) throw new Error('No hay playbooks. ¿Corriste el seed?');

  // 2) Armar `values` cubriendo los campos required (menos los derivados)
  const derived = ['character_name', 'playbook_name'];
  const fields = (pb.template || []).flatMap((s) => s.fields || []);
  const values = {};
  for (const f of fields) {
    if (f.required && !derived.includes(f.id)) values[f.id] = sampleValue(f);
  }

  const body = {
    name: 'Marlene',
    playbookId: pb.id,
    ownerId: 'usr_demo',
    values,
  };
  console.log('POST /characters body:\n', JSON.stringify(body, null, 2));

  // 3) Crear
  const createRes = await fetch(`${BASE}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await createRes.json();
  console.log('\ncreate status:', createRes.status);
  console.log(JSON.stringify(created, null, 2));
  if (createRes.status !== 201) return;

  // 4) Ver detalle + listar
  const detail = await (await fetch(`${BASE}/characters/${created.id}`)).json();
  console.log('\nGET /characters/:id →');
  console.log(JSON.stringify(detail, null, 2));

  const list = await (await fetch(`${BASE}/characters`)).json();
  console.log('\nGET /characters → total:', list.meta?.total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
