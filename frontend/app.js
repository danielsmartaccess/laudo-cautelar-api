const form = document.getElementById('laudo-form');
const scoreValue = document.getElementById('score-value');
const scoreBadge = document.getElementById('score-badge');
const scoreNotes = document.getElementById('score-notes');
const preview = document.getElementById('preview');

// Configuração da API (pode ser alterada via localStorage.setItem('api_base', 'http://localhost:3000'))
const API_BASE = localStorage.getItem('api_base') || 'http://localhost:3000';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

function getServerLaudoKey(placa) {
  const p = (placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `laudo_server_id_${p}`;
}

async function uploadFotosServidor(laudoId) {
  const input = document.getElementById('fotos');
  const files = input && input.files ? Array.from(input.files) : [];
  if (!laudoId || files.length === 0) return { uploaded: 0 };
  const formData = new FormData();
  files.forEach(f => formData.append('fotos', f));
  const res = await fetch(`${API_BASE}/api/laudos/${laudoId}/fotos`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload fotos falhou: ${res.status} ${text}`);
  }
  return res.json();
}

async function salvarNoServidor(data) {
  // Estratégia: se já temos um laudoId salvo por placa, damos PUT; senão, POST
  const key = getServerLaudoKey(data.placa);
  const laudoIdExistente = localStorage.getItem(key);
  try {
    let laudo;
    if (laudoIdExistente) {
      laudo = await api('PUT', `/api/laudos/${laudoIdExistente}`, data);
    } else {
      laudo = await api('POST', `/api/laudos`, data);
      if (laudo && laudo.id) localStorage.setItem(key, String(laudo.id));
    }
    const id = (laudo && laudo.id) || laudoIdExistente;
    // Upload de fotos se houver
    if (id) {
      try {
        const up = await uploadFotosServidor(id);
        if (up && up.fotos) console.log(`Upload: ${up.fotos.length} foto(s).`);
      } catch (e) {
        console.warn('Falha no upload das fotos:', e.message);
      }
    }
    return laudo;
  } catch (e) {
    console.warn('Servidor indisponível ou erro na API:', e.message);
    throw e;
  }
}

function readForm() {
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.pinturaEsp) data.pinturaEsp = Number(data.pinturaEsp);
  if (data.kmObd) data.kmObd = Number(data.kmObd);
  return data;
}

function calcIPA(data) {
  let score = 100;
  const notes = [];
  if (data.longarinas !== 'Íntegra') { score -= 25; notes.push('Longarinas com reparos/indícios'); }
  if (data.colunas !== 'Íntegra') { score -= 20; notes.push('Colunas com reparos/indícios'); }
  if (data.cortafogo !== 'Original') { score -= 10; notes.push('Painel corta-fogo alterado'); }
  if (data.colisaoGrave === 'Sim') { score -= 35; notes.push('Sinais de colisão grave'); }
  if (data.tonalidade === 'Sim') { score -= 5; notes.push('Diferença de tonalidade'); }
  if (data.vidrosOrig === 'Não') { score -= 3; notes.push('Vidros não originais'); }
  if (data.faroisOrig === 'Não') { score -= 3; notes.push('Faróis não originais'); }
  if (data.pinturaEsp && (data.pinturaEsp > 180 || data.pinturaEsp < 70)) { score -= 5; notes.push('Espessura de pintura fora do padrão'); }
  if (data.oxidacao === 'Leve') score -= 5;
  if (data.oxidacao === 'Moderada') score -= 12;
  if (data.oxidacao === 'Grave') { score -= 25; notes.push('Oxidação significativa (enchente?)'); }
  if (data.carpetes === 'Sinais de água') { score -= 15; notes.push('Carpetes/forros com sinais de água'); }
  if (data.odor === 'Sim') { score -= 8; notes.push('Odor de umidade'); }
  if (data.eletricoGeral === 'Irregular') { score -= 10; notes.push('Sistema elétrico irregular'); }
  if (data.falhasObd === 'Sim') { score -= 10; notes.push('Falhas registradas no OBD'); }
  if (data.consistenciaKm === 'Não') { score -= 20; notes.push('Inconsistência de quilometragem'); }
  if (data.airbags === 'Falha detectada') { score -= 12; notes.push('Falha de airbags'); }
  if (data.vazamentos === 'Sim') { score -= 8; notes.push('Vazamentos visíveis'); }
  if (data.pneus === 'Desgaste irregular') { score -= 5; notes.push('Pneus com desgaste irregular'); }
  if (data.suspensao === 'Irregularidades') { score -= 6; notes.push('Irregularidades na suspensão'); }
  if (data.direcao === 'Anomalia') { score -= 7; notes.push('Anomalia na direção'); }
  if (data.freios === 'Anomalia') { score -= 8; notes.push('Anomalia nos freios'); }
  if (data.sistemaEletrico === 'Falha') { score -= 5; notes.push('Falha no sistema elétrico'); }
  if (data.historicoRisco && data.historicoRisco !== 'Não') { score -= 10; notes.push(`Histórico: ${data.historicoRisco}`); }
  if (data.crlvOk === 'Não') { score -= 5; notes.push('CRLV/CRV não conferido'); }
  score = Math.max(0, Math.min(100, score));
  return { score, notes };
}

function setScoreView(s, notes) {
  scoreValue.textContent = s;
  let badge = 'Aguardando dados';
  let color = 'var(--secondary)';
  if (s >= 85) { badge = 'Verde – Excelente'; color = 'var(--ok)'; }
  else if (s >= 70) { badge = 'Amarelo – Bom'; color = 'var(--warn)'; }
  else if (s >= 50) { badge = 'Laranja – Atenção'; color = '#ff8c42'; }
  else { badge = 'Vermelho – Risco'; color = 'var(--danger)'; }
  scoreBadge.textContent = badge;
  scoreBadge.style.background = color;
  scoreNotes.innerHTML = '';
  notes.forEach(n => {
    const li = document.createElement('li');
    li.textContent = n;
    scoreNotes.appendChild(li);
  });
}

document.getElementById('fotos').addEventListener('change', (e) => {
  preview.innerHTML = '';
  Array.from(e.target.files).forEach(file => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    preview.appendChild(img);
  });
});

document.getElementById('btn-calc').addEventListener('click', () => {
  const data = readForm();
  const { score, notes } = calcIPA(data);
  setScoreView(score, notes);
  localStorage.setItem('laudo_current', JSON.stringify(data));
});

document.getElementById('btn-save').addEventListener('click', () => {
  const data = readForm();
  localStorage.setItem('laudo_current', JSON.stringify(data));
  // Tenta salvar no servidor também, sem quebrar o fluxo offline
  salvarNoServidor(data)
    .then((laudo) => {
      if (laudo && laudo.id) {
        alert(`Laudo salvo local e no servidor (ID ${laudo.id}).`);
      } else {
        alert('Laudo salvo localmente. Servidor sem ID retornado.');
      }
    })
    .catch(() => {
      alert('Laudo salvo no navegador (offline). Não foi possível contatar o servidor agora.');
    });
});

document.getElementById('btn-load').addEventListener('click', () => {
  const str = localStorage.getItem('laudo_current');
  if (!str) return alert('Nenhum laudo salvo.');
  const data = JSON.parse(str);
  for (const [k,v] of Object.entries(data)) {
    const el = form.elements[k];
    if (!el) continue;
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = v;
  }
  alert('Laudo carregado do LocalStorage.');
});

document.getElementById('btn-new').addEventListener('click', () => {
  form.reset();
  setScoreView('—', []);
  preview.innerHTML = '';
});

document.getElementById('btn-export').addEventListener('click', () => {
  const data = readForm();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laudo_${(data.placa||'semplaca')}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      for (const [k,v] of Object.entries(data)) {
        const el = form.elements[k];
        if (!el) continue;
        el.value = v;
      }
      alert('Laudo importado.');
    } catch (err) {
      alert('Arquivo inválido.');
    }
  };
  reader.readAsText(file);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = readForm();
  const { score, notes } = calcIPA(data);
  setScoreView(score, notes);
  let resumo = {
    meta: { geradoEm: new Date().toISOString(), ipa: score, badge: scoreBadge.textContent },
    dados: data,
    notas: notes
  };
  const tpl = document.getElementById('tpl-resumo').content.cloneNode(true);
  tpl.querySelector('#resumo-json').textContent = JSON.stringify(resumo, null, 2);
  document.body.appendChild(tpl);
  window.scrollTo(0, document.body.scrollHeight);
});

document.getElementById('btn-print').addEventListener('click', () => window.print());

setScoreView('—', []);
