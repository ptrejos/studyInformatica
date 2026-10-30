(() => {
  "use strict";
  const ALL = window.QUESTIONS.slice().sort((a, b) => a.id - b.id);
  const LETTERS = ["a", "b", "c", "d"];
  const LEVELS = ["Fácil", "Intermedia", "Difícil"];
  const PLURAL = { "Fácil": "Fáciles", "Intermedia": "Intermedias", "Difícil": "Difíciles" };
  const SIZES = [
    { n: 10, lbl: "Test rápido", desc: "5 min · repaso express" },
    { n: 20, lbl: "Test corto", desc: "10 min · repaso por bloques" },
    { n: 40, lbl: "Test medio", desc: "20 min · práctica seria" },
    { n: 150, lbl: "Todo el banco", desc: "Las 150 preguntas", all: true },
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const screens = { home: $("screen-home"), study: $("screen-study"), progress: $("screen-progress"), quiz: $("screen-quiz"), result: $("screen-result") };

  /* ---------- Almacenamiento local ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
  };
  const K = { wrong: "autoeval.wrong", hist: "autoeval.history", stats: "autoeval.stats", known: "autoeval.known", seqT: "autoeval.seqTest", seqS: "autoeval.seqStudy" };
  const getWrong = () => new Set(store.get(K.wrong, []));
  const getKnown = () => new Set(store.get(K.known, []));

  /* ---------- Configuración (test y estudio) ---------- */
  const cfg = {
    test: { level: "todos", week: "todas", order: store.get("autoeval.orderTest", "random") },
    study: { level: "todos", week: "todas", order: store.get("autoeval.orderStudy", "seq") },
  };
  const filtered = (c) => c.level !== "todos" || c.week !== "todas";
  const poolOf = (c) => ALL.filter((q) => (c.level === "todos" || q.level === c.level) && (c.week === "todas" || q.week === +c.week));
  const keyOf = (c) => `${c.level}|${c.week}`;

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // Secuencial: sigue el orden del balotario (N.º 1–150) y continúa donde se quedó
  function sequential(pool, ptrKey, c) {
    if (!pool.length) return [];
    const last = (store.get(ptrKey, {}))[keyOf(c)] || 0;
    let start = pool.findIndex((q) => q.id > last); if (start < 0) start = 0;
    return pool.slice(start).concat(pool.slice(0, start));
  }
  function setPointer(ptrKey, c, id) { const o = store.get(ptrKey, {}); o[keyOf(c)] = id; store.set(ptrKey, o); }
  function resetPointer(ptrKey, c) { const o = store.get(ptrKey, {}); delete o[keyOf(c)]; store.set(ptrKey, o); }

  function buildTest(n) {
    const c = cfg.test, p = poolOf(c);
    if (c.order === "seq") return sequential(p, K.seqT, c).slice(0, n);
    if (n >= p.length) return shuffle(p);
    if (filtered(c)) return shuffle(p).slice(0, n);
    const shares = { "Fácil": 0.5, "Intermedia": 0.3, "Difícil": 0.2 };
    let out = [];
    for (const [lvl, s] of Object.entries(shares)) out = out.concat(shuffle(p.filter((q) => q.level === lvl)).slice(0, Math.round(n * s)));
    return shuffle(out);
  }

  /* ---------- Navegación por pestañas ---------- */
  let currentTab = "home";
  function showScreen(name) {
    for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
    $("tabbar").hidden = name === "quiz";
    window.scrollTo({ top: 0 });
  }
  function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (tab === "home") { renderHome(); }
    else if (tab === "study") { renderStudySetup(); }
    else { renderProgress(); }
  }

  /* ---------- Controles reutilizables ---------- */
  function orderControl(el, c, ptrKey, onChange, orderStoreKey) {
    el.innerHTML = "";
    [["random", "🔀 Aleatorio", "Las preguntas se mezclan al azar"], ["seq", "↕ Secuencial", "En el orden del balotario (N.º 1 a 150)"]].forEach(([v, t, d]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "order__opt"; b.setAttribute("aria-pressed", String(c.order === v));
      b.innerHTML = `<b>${t}</b><span>${d}</span>`;
      b.addEventListener("click", () => { c.order = v; store.set(orderStoreKey, v); onChange(); });
      el.appendChild(b);
    });
  }
  function filterControls(el, c, prefix, onChange) {
    el.innerHTML = `<div class="field"><span class="field__lbl" id="${prefix}-lbl">Nivel de dificultad</span><div class="chips" id="${prefix}-chips" role="group" aria-labelledby="${prefix}-lbl"></div></div>
      <div class="field"><label class="field__lbl" for="${prefix}-week">Semana del curso</label><select id="${prefix}-week" class="select"></select></div>
      <p class="note" id="${prefix}-note"></p>`;
    const chips = el.querySelector(`#${prefix}-chips`);
    [["todos", "Todos"], ...LEVELS.map((l) => [l, l])].forEach(([v, t]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = t; b.setAttribute("aria-pressed", String(c.level === v));
      b.addEventListener("click", () => { c.level = v; onChange(); });
      chips.appendChild(b);
    });
    const sel = el.querySelector(`#${prefix}-week`);
    sel.innerHTML = `<option value="todas">Todas las semanas</option>` + Array.from({ length: 15 }, (_, i) => `<option value="${i + 1}">Semana ${i + 1}</option>`).join("");
    sel.value = c.week;
    sel.addEventListener("change", () => { c.week = sel.value; onChange(); });
    const total = poolOf(c).length;
    el.querySelector(`#${prefix}-note`).textContent = filtered(c)
      ? `Con este filtro hay ${total} pregunta${total === 1 ? "" : "s"}.` : "Sin filtros: se usa todo el banco de 150 preguntas.";
  }
  function seqNote(el, c, ptrKey, onChange) {
    if (c.order !== "seq") { el.textContent = ""; return; }
    const pool = poolOf(c);
    const last = (store.get(ptrKey, {}))[keyOf(c)] || 0;
    const nxt = pool.find((q) => q.id > last) || pool[0];
    el.innerHTML = "";
    if (!nxt) return;
    el.append(`Empezarás en la pregunta N.º ${nxt.id}${last ? " (continúas donde te quedaste)" : ""}. `);
    if (last) { const b = document.createElement("button"); b.type = "button"; b.className = "linkbtn"; b.textContent = "Volver al principio"; b.addEventListener("click", () => { resetPointer(ptrKey, c); onChange(); }); el.appendChild(b); }
  }

  /* ---------- INICIO ---------- */
  function renderHome() {
    const c = cfg.test;
    orderControl($("test-order"), c, K.seqT, renderHome, "autoeval.orderTest");
    seqNote($("seq-note"), c, K.seqT, renderHome);
    if (c.order !== "seq") $("seq-note").textContent = filtered(c) ? "Las preguntas del conjunto elegido se mezclan al azar." : "Se mezclan al azar manteniendo la proporción del banco: 50 % fáciles, 30 % intermedias y 20 % difíciles.";
    const det = $("filters");
    filterControls($("test-filters"), c, "tf", renderHome);
    const total = poolOf(c).length, grid = $("size-grid");
    grid.innerHTML = "";
    SIZES.forEach((s) => {
      const real = Math.min(s.n, total);
      const b = document.createElement("button");
      b.type = "button"; b.className = "size-card" + (s.all ? " size-card--all" : "");
      const sub = s.all ? `${total} pregunta${total === 1 ? "" : "s"}` : `${s.n} preguntas`;
      const extra = !s.all && s.n > total ? `Se usarán ${real} (todas las disponibles)` : s.desc;
      b.innerHTML = `<span class="size-card__num">${s.all ? "TODO" : s.n}</span><span class="size-card__lbl">${sub}</span><span class="size-card__desc">${esc(extra)}</span>`;
      b.setAttribute("aria-label", `${s.lbl}: ${real} preguntas`);
      b.disabled = total === 0;
      b.addEventListener("click", () => start(buildTest(s.n), s.n, null));
      grid.appendChild(b);
    });
    const ids = getWrong(), n = ALL.filter((q) => ids.has(q.id)).length;
    $("retry-box").hidden = n === 0;
    if (n) $("retry-text").textContent = `Tienes ${n} pregunta${n === 1 ? "" : "s"} que fallaste antes. Si las aciertas, saldrán de esta lista.`;
    det.open = det.open || filtered(c);
    showScreen("home");
  }

  /* ---------- TEST ---------- */
  let state = null;
  function start(items, size, label) {
    if (!items.length) return;
    const c = cfg.test, flt = [];
    if (label !== "errores") { if (c.level !== "todos") flt.push(c.level); if (c.week !== "todas") flt.push("Semana " + c.week); }
    const orden = label === "errores" ? "" : (c.order === "seq" ? " · secuencial" : " · aleatorio");
    state = { size, items, idx: 0, answers: [], locked: false, retry: label === "errores", seq: label !== "errores" && c.order === "seq",
      label: label === "errores" ? "Repaso de errores" : `${items.length} preguntas${flt.length ? " · " + flt.join(" · ") : ""}${orden}` };
    showScreen("quiz");
    renderQuestion();
  }
  function renderQuestion() {
    const { items, idx } = state, q = items[idx];
    state.locked = false;
    $("quiz-count").textContent = `Pregunta ${idx + 1} de ${items.length}`;
    $("quiz-score").textContent = idx ? `Aciertos: ${state.answers.filter((a) => a.correct).length} de ${idx}` : "";
    const pct = Math.round((idx / items.length) * 100);
    $("progress-bar").style.width = pct + "%"; $("progress").setAttribute("aria-valuenow", pct);
    const lv = $("q-level"); lv.textContent = q.level; lv.dataset.level = q.level;
    $("q-week").textContent = "Semana " + q.week;
    $("q-text").textContent = q.q;
    const box = $("q-options"); box.innerHTML = "";
    q.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt"; b.dataset.i = i;
      b.innerHTML = `<span class="opt__key" aria-hidden="true">${LETTERS[i]}</span><span class="opt__text">${esc(o)}</span><span class="opt__mark" aria-hidden="true"></span>`;
      b.setAttribute("aria-label", `Alternativa ${LETTERS[i]}: ${o}`);
      b.addEventListener("click", () => answer(i));
      box.appendChild(b);
    });
    $("feedback").hidden = true; $("btn-next").hidden = true;
    $("q-text").focus({ preventScroll: true });
  }
  function answer(i) {
    if (state.locked) return;
    state.locked = true;
    const q = state.items[state.idx], correct = i === q.answer;
    state.answers.push({ q, chosen: i, correct });
    // estadística por pregunta y puntero secuencial
    const st = store.get(K.stats, {}), e = st[q.id] || { ok: 0, bad: 0, last: 0 };
    if (correct) e.ok++; else e.bad++; e.last = correct ? 1 : 0; st[q.id] = e; store.set(K.stats, st);
    if (state.seq) setPointer(K.seqT, cfg.test, q.id);
    document.querySelectorAll("#q-options .opt").forEach((b) => {
      const k = +b.dataset.i; b.disabled = true;
      const mark = b.querySelector(".opt__mark");
      if (k === q.answer) { b.classList.add("is-correct"); mark.textContent = "✔ Correcta"; }
      else if (k === i) { b.classList.add("is-wrong"); mark.textContent = "✖ Tu respuesta"; }
      else b.classList.add("is-dim");
    });
    const fb = $("feedback");
    fb.className = "feedback " + (correct ? "feedback--ok" : "feedback--bad");
    fb.innerHTML = correct ? `<strong>✔ ¡Correcto!</strong><span>Muy bien, ${LETTERS[q.answer]}) es la respuesta.</span>`
      : `<strong>✖ Incorrecto</strong><span>La respuesta correcta es <b>${LETTERS[q.answer]})</b> ${esc(q.options[q.answer])}</span>`;
    fb.hidden = false;
    const next = $("btn-next");
    next.textContent = state.idx === state.items.length - 1 ? "Ver resultados" : "Siguiente pregunta →";
    next.hidden = false; next.focus();
    $("quiz-score").textContent = `Aciertos: ${state.answers.filter((a) => a.correct).length} de ${state.answers.length}`;
  }
  function next() {
    if (!state.locked) return;
    if (state.idx === state.items.length - 1) return finish();
    state.idx++; renderQuestion();
  }

  /* ---------- RESULTADOS ---------- */
  function finish() {
    const total = state.answers.length, ok = state.answers.filter((a) => a.correct).length, bad = total - ok, pct = Math.round((ok / total) * 100);
    const wrong = getWrong();
    state.answers.forEach((a) => (a.correct ? wrong.delete(a.q.id) : wrong.add(a.q.id)));
    store.set(K.wrong, [...wrong]);
    store.set(K.hist, [{ t: Date.now(), label: state.label, ok, total, pct }, ...store.get(K.hist, [])].slice(0, 30));
    $("r-ok").textContent = ok; $("r-bad").textContent = bad; $("r-total").textContent = total;
    const ring = $("ring");
    ring.style.setProperty("--p", pct);
    ring.style.setProperty("--ring-color", pct >= 70 ? "var(--ok-border)" : pct >= 50 ? "#F59E0B" : "var(--bad-border)");
    ring.setAttribute("aria-label", `${pct} por ciento de aciertos`);
    $("ring-text").textContent = pct + "%";
    const msg = pct === 100 ? "¡Excelente! Respondiste todo correctamente." : pct >= 80 ? "¡Muy buen resultado! Repasa solo los puntos que fallaste."
      : pct >= 60 ? "Vas bien. Revisa las preguntas incorrectas y vuelve a intentarlo." : "Aún puedes mejorar. Estudia las respuestas correctas de abajo y repite el test.";
    $("r-msg").innerHTML = `Acertaste <b>${ok}</b> de <b>${total}</b> preguntas y te equivocaste en <b>${bad}</b>. ${msg}`;
    $("r-levels").innerHTML = LEVELS.map((l) => {
      const arr = state.answers.filter((a) => a.q.level === l); if (!arr.length) return "";
      const c = arr.filter((a) => a.correct).length;
      return `<div class="lvl-row"><span>${PLURAL[l]}</span><div class="lvl-bar" aria-hidden="true"><span style="width:${(c / arr.length) * 100}%"></span></div><b>${c}/${arr.length}</b></div>`;
    }).join("");
    $("btn-again").textContent = state.retry ? "Repasar errores otra vez" : (state.seq ? "Continuar con las siguientes" : "Repetir con otras preguntas");
    $("btn-again").hidden = state.retry && wrong.size === 0;
    renderReview("bad");
    document.querySelectorAll(".seg__btn").forEach((b) => { const on = b.dataset.filter === "bad"; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
    showScreen("result");
    $("result-title").focus({ preventScroll: true });
  }
  function renderReview(filter) {
    const list = $("review-list");
    const items = state.answers.map((a, i) => ({ ...a, n: i + 1 })).filter((a) => filter === "all" || !a.correct);
    if (!items.length) { list.innerHTML = `<li class="empty">🎉 No tuviste ninguna pregunta incorrecta.</li>`; return; }
    list.innerHTML = items.map((a) => {
      const { q } = a, wrong = !a.correct;
      return `<li class="rev ${wrong ? "rev--bad" : "rev--ok"}">
        <div class="rev__top"><span class="rev__n">Pregunta ${a.n} · N.º ${q.id}</span>
          <span class="tag tag--level" data-level="${q.level}">${q.level}</span><span class="tag">Semana ${q.week}</span></div>
        <p class="rev__q">${esc(q.q)}</p>
        ${wrong ? `<div class="rev__line rev__line--bad"><b>✖ Tu respuesta:</b><span>${LETTERS[a.chosen]}) ${esc(q.options[a.chosen])}</span></div>` : ""}
        <div class="rev__line rev__line--ok"><b>✔ ${wrong ? "Alternativa correcta:" : "Respondiste bien:"}</b><span>${LETTERS[q.answer]}) ${esc(q.options[q.answer])}</span></div>
      </li>`;
    }).join("");
  }

  /* ---------- ESTUDIAR ---------- */
  let study = null; // { items, idx, revealed, chosen, key }
  function renderStudySetup() {
    const c = cfg.study;
    $("study-setup").hidden = false; $("study-card").hidden = true;
    orderControl($("study-order"), c, K.seqS, renderStudySetup, "autoeval.orderStudy");
    seqNote($("study-seq-note"), c, K.seqS, renderStudySetup);
    if (c.order !== "seq") $("study-seq-note").textContent = "Las preguntas se presentan mezcladas al azar.";
    filterControls($("study-filters"), c, "sf", renderStudySetup);
    $("btn-study-reset").hidden = c.order !== "seq";
    const n = poolOf(c).length;
    $("btn-study-start").disabled = n === 0;
    $("btn-study-start").textContent = n ? `Comenzar a estudiar (${n})` : "No hay preguntas con este filtro";
    showScreen("study");
  }
  function startStudy() {
    const c = cfg.study, pool = poolOf(c);
    if (!pool.length) return;
    study = { items: c.order === "seq" ? sequential(pool, K.seqS, c) : shuffle(pool), idx: 0, revealed: false, chosen: null };
    $("study-setup").hidden = true; $("study-card").hidden = false;
    renderStudyCard();
  }
  function renderStudyCard() {
    const { items, idx } = study, q = items[idx], known = getKnown();
    study.revealed = false; study.chosen = null;
    $("study-count").textContent = `Pregunta ${idx + 1} de ${items.length}`;
    $("study-known").textContent = `Dominadas: ${items.filter((x) => known.has(x.id)).length}`;
    $("study-bar").style.width = Math.round(((idx + 1) / items.length) * 100) + "%";
    const lv = $("s-level"); lv.textContent = q.level; lv.dataset.level = q.level;
    $("s-week").textContent = "Semana " + q.week; $("s-id").textContent = "N.º " + q.id;
    $("s-text").textContent = q.q;
    const box = $("s-options"); box.innerHTML = "";
    q.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt is-plain"; b.dataset.i = i;
      b.innerHTML = `<span class="opt__key" aria-hidden="true">${LETTERS[i]}</span><span class="opt__text">${esc(o)}</span><span class="opt__mark" aria-hidden="true"></span>`;
      b.setAttribute("aria-label", `Alternativa ${LETTERS[i]}: ${o}`);
      b.addEventListener("click", () => revealStudy(i));
      box.appendChild(b);
    });
    $("s-answer").hidden = true;
    $("btn-s-show").hidden = false;
    $("btn-s-prev").disabled = idx === 0;
    $("btn-s-next").textContent = idx === items.length - 1 ? "Terminar ✓" : "Siguiente →";
    updateKnownBtn();
    $("s-text").focus({ preventScroll: true });
  }
  function revealStudy(i) {
    if (study.revealed) return;
    const q = study.items[study.idx];
    study.revealed = true;
    document.querySelectorAll("#s-options .opt").forEach((b) => {
      const k = +b.dataset.i, mark = b.querySelector(".opt__mark");
      b.disabled = true;
      if (k === q.answer) { b.classList.add("is-correct"); mark.textContent = "✔ Correcta"; }
      else if (i === k) { b.classList.add("is-wrong"); mark.textContent = "✖ Elegiste esta"; }
      else b.classList.add("is-dim");
    });
    const a = $("s-answer");
    a.innerHTML = `<strong>Respuesta correcta</strong><span><b>${LETTERS[q.answer]})</b> ${esc(q.options[q.answer])}</span>`;
    a.hidden = false; $("btn-s-show").hidden = true;
    if (cfg.study.order === "seq") setPointer(K.seqS, cfg.study, q.id);
  }
  function updateKnownBtn() {
    const q = study.items[study.idx], on = getKnown().has(q.id), b = $("btn-s-known");
    b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "★ Dominada" : "☆ Ya la domino";
  }
  function toggleKnown() {
    const q = study.items[study.idx], k = getKnown();
    if (k.has(q.id)) k.delete(q.id); else k.add(q.id);
    store.set(K.known, [...k]); updateKnownBtn();
    $("study-known").textContent = `Dominadas: ${study.items.filter((x) => k.has(x.id)).length}`;
  }
  function studyNext() {
    if (study.idx === study.items.length - 1) { renderStudySetup(); return; }
    // en modo secuencial, avanzar deja el puntero en la pregunta vista
    if (cfg.study.order === "seq") setPointer(K.seqS, cfg.study, study.items[study.idx].id);
    study.idx++; renderStudyCard();
  }
  function studyPrev() { if (study.idx > 0) { study.idx--; renderStudyCard(); } }

  /* ---------- PROGRESO ---------- */
  const pctClass = (p) => (p >= 70 ? "good" : p >= 50 ? "mid" : "low");
  function renderProgress() {
    const hist = store.get(K.hist, []), stats = store.get(K.stats, {}), known = getKnown(), wrong = getWrong();
    const hasData = hist.length || Object.keys(stats).length || known.size;
    $("prog-empty").hidden = !!hasData; $("prog-body").hidden = !hasData;
    if (hasData) {
      const avg = hist.length ? Math.round(hist.reduce((s, h) => s + h.pct, 0) / hist.length) : 0;
      const best = hist.length ? Math.max(...hist.map((h) => h.pct)) : 0;
      let ok = 0, bad = 0;
      Object.values(stats).forEach((e) => { ok += e.ok; bad += e.bad; });
      const acc = ok + bad ? Math.round((ok / (ok + bad)) * 100) : 0;
      $("kpis").innerHTML = [[hist.length, "Tests realizados"], [hist.length ? avg + "%" : "—", "Promedio"], [hist.length ? best + "%" : "—", "Mejor resultado"], [ok + bad ? acc + "%" : "—", "Aciertos totales"]]
        .map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
      const mastered = ALL.filter((q) => known.has(q.id) || (stats[q.id] && stats[q.id].last === 1)).length;
      $("mastery-fill").style.width = Math.round((mastered / ALL.length) * 100) + "%";
      $("mastery-bar").setAttribute("aria-valuenow", mastered);
      $("mastery-txt").textContent = `${mastered} de ${ALL.length} preguntas dominadas (marcadas en Estudiar o acertadas la última vez). Con errores pendientes: ${wrong.size}.`;
      $("p-levels").innerHTML = LEVELS.map((l) => {
        let o = 0, b = 0; ALL.filter((q) => q.level === l).forEach((q) => { const e = stats[q.id]; if (e) { o += e.ok; b += e.bad; } });
        const p = o + b ? Math.round((o / (o + b)) * 100) : 0;
        return `<div class="lvl-row"><span>${PLURAL[l]}</span><div class="lvl-bar" aria-hidden="true"><span style="width:${p}%"></span></div><b>${o + b ? p + "%" : "—"}</b></div>`;
      }).join("");
      const wk = $("p-weeks"); wk.innerHTML = "";
      for (let w = 1; w <= 15; w++) {
        let o = 0, b = 0; ALL.filter((q) => q.week === w).forEach((q) => { const e = stats[q.id]; if (e) { o += e.ok; b += e.bad; } });
        const p = o + b ? Math.round((o / (o + b)) * 100) : null;
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "wk" + (p === null ? "" : " wk--" + pctClass(p));
        btn.innerHTML = `<small>Sem. ${w}</small><b>${p === null ? "—" : p + "%"}</b>`;
        btn.setAttribute("aria-label", `Semana ${w}: ${p === null ? "sin datos" : p + " por ciento de aciertos"}. Tocar para estudiar.`);
        btn.addEventListener("click", () => { cfg.study.week = String(w); cfg.study.level = "todos"; showTab("study"); });
        wk.appendChild(btn);
      }
      $("history-list").innerHTML = hist.slice(0, 8).map((e) => {
        const d = new Date(e.t).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
        return `<li><span>${d} · ${esc(e.label)}</span><b class="${pctClass(e.pct)}">${e.ok}/${e.total} (${e.pct}%)</b></li>`;
      }).join("") || `<li><span>Aún no hay tests.</span></li>`;
      $("btn-p-retry").hidden = wrong.size === 0;
    }
    showScreen("progress");
  }

  /* ---------- EVENTOS ---------- */
  const retryErrors = () => { const ids = getWrong(); start(shuffle(ALL.filter((q) => ids.has(q.id))), 0, "errores"); };
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("btn-next").addEventListener("click", next);
  $("btn-exit").addEventListener("click", () => { if (confirm("¿Salir del test? Se conservan las respuestas ya dadas en tu progreso.")) showTab("home"); });
  $("btn-again").addEventListener("click", () => { if (state.retry) retryErrors(); else start(buildTest(state.size), state.size, null); });
  $("btn-home").addEventListener("click", () => showTab("home"));
  $("btn-retry").addEventListener("click", retryErrors);
  $("btn-p-retry").addEventListener("click", retryErrors);
  $("btn-clear").addEventListener("click", () => {
    if (confirm("¿Borrar todo tu progreso (tests, errores, dominadas y avance secuencial)?")) { Object.values(K).forEach((k) => store.set(k, k === K.seqT || k === K.seqS || k === K.stats ? {} : [])); renderProgress(); }
  });
  $("btn-study-start").addEventListener("click", startStudy);
  $("btn-study-reset").addEventListener("click", () => { resetPointer(K.seqS, cfg.study); renderStudySetup(); });
  $("btn-study-exit").addEventListener("click", renderStudySetup);
  $("btn-s-show").addEventListener("click", () => revealStudy(-1));
  $("btn-s-known").addEventListener("click", toggleKnown);
  $("btn-s-next").addEventListener("click", studyNext);
  $("btn-s-prev").addEventListener("click", studyPrev);
  document.querySelectorAll(".seg__btn").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".seg__btn").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b); });
    renderReview(b.dataset.filter);
  }));
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (!screens.quiz.hidden) {
      if (!state.locked) { const i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : ["1", "2", "3", "4"].indexOf(k); if (i >= 0) { e.preventDefault(); answer(i); } }
      else if (k === "enter" && document.activeElement !== $("btn-next")) { e.preventDefault(); next(); }
    } else if (!screens.study.hidden && !$("study-card").hidden) {
      if (k === "arrowright") { e.preventDefault(); studyNext(); }
      else if (k === "arrowleft") { e.preventDefault(); studyPrev(); }
      else if (k === " " && !study.revealed && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); revealStudy(-1); }
    }
  });

  /* ---------- Instalación como app (PWA) ---------- */
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("btn-install").hidden = false; });
  $("btn-install").addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("btn-install").hidden = true; });
  window.addEventListener("appinstalled", () => { $("btn-install").hidden = true; });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

  showTab("home");
})();
