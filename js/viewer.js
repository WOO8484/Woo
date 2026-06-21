/* ══════════════════════════════════════════════
   Mr.woo v2.7.1  —  js/viewer.js
   기본 뷰어
   ══════════════════════════════════════════════ */
'use strict';

let _vNov  = null; // 현재 소설
let _vChs  = [];   // 챕터 배열
let _vCur  = 0;    // 현재 챕터 인덱스

/* ── 챕터 파싱 ─────────────────────────────── */
function parseChs(text) {
  const lines = text.split('\n');
  const chs = []; let title = '', body = [];
  const isChLine = l => {
    const t = l.trim();
    if (!t || t.length > 80) return false;
    if (/^[\*\-=─━\s·.]{3,}$/.test(t)) return false;
    return /^(\d{1,4}[화장편권]|제\s*\d+\s*[화장편권]|\d{1,4}\.\s+\S)/.test(t)
      || /^chapter\s*\d+/i.test(t)
      || /^(프롤로그|에필로그|후기|작가의\s*말|외전|번외|챕터\s*\d+)/.test(t)
      || /^[★◆■◇◈▶●○※]\s*.{1,20}$/.test(t);
  };
  for (const line of lines) {
    if (isChLine(line)) {
      if (title || body.join('').trim())
        chs.push({ title: title || '본문', content: body.join('\n').trim() });
      title = line.trim(); body = [];
    } else body.push(line);
  }
  if (title || body.join('').trim())
    chs.push({ title: title || '본문', content: body.join('\n').trim() });
  return chs.length ? chs : [{ title: '본문', content: text }];
}

/* ── 뷰어 열기 ─────────────────────────────── */
async function openViewer(id) {
  const nov = novels.find(x => x.id === id);
  if (!nov) return;

  // 본문 로드
  if (!nov._text && nov.textUrl) {
    showToast('본문 불러오는 중...', '', 8000);
    try {
      const res = await fetch(nov.textUrl);
      nov._text = await res.text();
    } catch(e) {
      showToast('본문을 불러오지 못했어요', 'error');
      return;
    }
  }
  if (!nov._text) { showToast('읽을 수 있는 파일이 없어요', 'error'); return; }

  _vNov = nov;
  _vChs = parseChs(nov._text);
  const saved = getNovelUserData(id);
  _vCur = Math.min(saved.ch || 0, _vChs.length - 1);

  document.getElementById('vTitle').textContent = nov.title;
  document.getElementById('mainNav').style.display = 'none';
  document.getElementById('tabBar').style.display  = 'none';
  document.getElementById('viewer').classList.add('open');

  renderViewer();
}

/* ── 뷰어 닫기 ─────────────────────────────── */
function closeViewer() {
  if (_vNov) {
    const pct = _vChs.length > 1
      ? Math.min(99, Math.round((_vCur / (_vChs.length - 1)) * 100))
      : (getNovelUserData(_vNov.id).progress || 1);
    setNovelUserData(_vNov.id, { ch: _vCur, progress: pct, lastReadAt: new Date().toISOString() });
  }
  document.getElementById('viewer').classList.remove('open');
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('tabBar').style.display  = 'flex';
  renderHome();
}

/* ── 챕터 렌더링 ───────────────────────────── */
function renderViewer() {
  const ch    = _vChs[_vCur];
  const total = _vChs.length;
  const body  = document.getElementById('vBody');

  // 본문 렌더
  const paras = ch.content.split(/\n+/).filter(p => p.trim());
  body.innerHTML = paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  body.scrollTop = 0;

  // 페이저
  document.getElementById('vPager').textContent = `${_vCur + 1} / ${total}`;

  // 버튼 상태
  document.getElementById('vPrevBtn').disabled = _vCur === 0;
  document.getElementById('vNextBtn').disabled = _vCur === total - 1;
}

/* ── 챕터 이동 ─────────────────────────────── */
function viewerPrev() {
  if (_vCur > 0) { _vCur--; renderViewer(); }
}
function viewerNext() {
  if (_vCur < _vChs.length - 1) { _vCur++; renderViewer(); }
  else {
    // 완독
    setNovelUserData(_vNov.id, { progress: 100, ch: 0, lastReadAt: new Date().toISOString() });
    showToast('완독했어요 🎉');
    closeViewer();
  }
}
