/**
 * Culturalis Borgeaud — interações do site (sem bibliotecas externas).
 *  1. Cabeçalho: compacta e muda de cor ao descer; esconde-se ao continuar a descer.
 *  2. Menu de telemóvel.
 *  3. Elementos que aparecem ao entrar no ecrã.
 *  4. Contadores animados (35+, 300+).
 *  5. Paralaxe: camadas que se movem a velocidades diferentes.
 *  6. Faixa de texto em movimento que acelera (e inverte) com o scroll.
 *  7. Scroll suave com inércia (só desktop com rato).
 * Intensidades e interruptores vêm do Editor de Design (variáveis CSS).
 */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name) => parseFloat(getComputedStyle(root).getPropertyValue('--' + name)) || 0;

  let settings = {};
  const readSettings = () => {
    settings = {
      parallax: cssVar('parallax'),
      smoothOn: cssVar('smooth-on') === 1,
    };
  };
  readSettings();

  /* ---------- 1. Cabeçalho ---------- */
  const header = document.querySelector('[data-header]');
  let lastY = window.scrollY;
  const onScrollHeader = (y) => {
    header.classList.toggle('is-scrolled', y > 40);
    const goingDown = y > lastY + 2 && y > window.innerHeight * 0.6;
    const goingUp = y < lastY - 2;
    if (goingDown && !document.body.classList.contains('menu-open')) header.classList.add('is-hidden');
    if (goingUp || y < 40) header.classList.remove('is-hidden');
    lastY = y;
  };

  /* ---------- 2. Menu de telemóvel ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const label = toggle && toggle.querySelector('.menu-toggle__label');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? label.dataset.close : label.dataset.open;
  };
  if (toggle) {
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    document.querySelectorAll('[data-nav] a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- 3. Aparecer ao entrar no ecrã ---------- */
  document.querySelectorAll('.motif, .bars').forEach((m) => m.querySelectorAll('i').forEach((el, i) => el.style.setProperty('--k', i)));
  const revealables = document.querySelectorAll('.reveal, .motif--reveal, .bars, .step, .grid-draw, .stack-squares');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    // O motivo do rodapé fica no fim da página: nunca passaria a margem de -8%, por isso usa um observador sem margem
    const atBottom = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); atBottom.unobserve(entry.target); } });
    }, { threshold: 0.3 });
    revealables.forEach((el) => (el.closest('.footer-motif') ? atBottom : io).observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- 4. Contadores ----------
     O número real está no HTML (é o que o Google e as IAs leem); só no browser parte do zero. */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const start = performance.now();
    const duration = 1800 / Math.max(cssVar('motion'), 0.1);
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * p);             // rápido no início, abranda no fim
      el.textContent = Math.round(target * (p === 1 ? 1 : eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduceMotion) {
    counters.forEach((el) => { if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = '0'; });
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        co.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => { if (el.textContent === '0') co.observe(el); });
  }

  /* ---------- 5. Paralaxe ---------- */
  const layers = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax]')];
  const parallax = () => {
    const vh = window.innerHeight;
    layers.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;   // fora do ecrã: não gasta recursos
      const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax) * settings.parallax;
      el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    });
  };

  /* ---------- 6. Faixa de texto do rodapé ----------
     Corre a velocidade constante e lenta (só CSS): pedido do Gonçalo para uma faixa calma, com classe. */
  /* ---------- 7. Scroll suave (desktop com rato) ---------- */
  const canSmooth = () => settings.smoothOn && !reduceMotion && window.matchMedia('(pointer: fine) and (min-width: 900px)').matches;
  let target = window.scrollY;
  let current = window.scrollY;
  let smoothing = false;
  window.addEventListener('wheel', (e) => {
    if (!canSmooth() || e.ctrlKey || document.body.classList.contains('menu-open') || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (!smoothing) { current = window.scrollY; target = current; }
    target = Math.max(0, Math.min(max, target + delta));
    smoothing = true;
  }, { passive: false });

  /* Um só ciclo por frame para tudo o que depende do scroll.
     Só corre enquanto há movimento: parado, não gasta bateria nem processador. */
  let prevY = window.scrollY;
  let running = false;
  let idleFrames = 0;
  const loop = () => {
    if (smoothing) {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.5) { current = target; smoothing = false; }
      window.scrollTo({ top: current, behavior: 'instant' });
    }
    const y = window.scrollY;
    const velocity = y - prevY;
    prevY = y;
    if (header) onScrollHeader(y);
    if (velocity !== 0) parallax();
    idleFrames = velocity === 0 && !smoothing ? idleFrames + 1 : 0;
    if (idleFrames > 40) { running = false; return; }   // parado há ~0,7 s
    requestAnimationFrame(loop);
  };
  const wake = () => { if (!running) { running = true; idleFrames = 0; requestAnimationFrame(loop); } };
  // Teclado, barra de scroll e links internos continuam a funcionar: o alvo acompanha o scroll real
  window.addEventListener('scroll', () => { if (!smoothing) target = current = window.scrollY; wake(); }, { passive: true });
  window.addEventListener('wheel', wake, { passive: true });
  window.addEventListener('resize', parallax, { passive: true });
  parallax();
  if (header) onScrollHeader(window.scrollY);

  /* ---------- 8. Projetos: mapa interativo ----------
     Clicar num ponto abre uma pequena janela com a descrição; daí abre-se o projeto ou desce-se até ao cartão. */
  const mapBox = document.querySelector('[data-map]');
  if (mapBox) {
    const pop = mapBox.querySelector('[data-map-pop]');
    const field = (k) => pop.querySelector('[data-pop-' + k + ']');
    let openLink = null;
    const closePop = () => { pop.hidden = true; if (openLink) openLink.classList.remove('is-open'); openLink = null; };
    const openPop = (link) => {
      closePop();
      openLink = link;
      link.classList.add('is-open');
      field('meta').textContent = link.dataset.meta;
      field('name').textContent = link.dataset.name;
      field('desc').textContent = link.dataset.desc;
      field('open').href = link.getAttribute('href');
      field('list').href = '#p-' + link.dataset.slug;
      pop.hidden = false;
      // Junto ao ponto, sem sair da caixa do mapa
      const box = mapBox.getBoundingClientRect();
      const r = link.getBoundingClientRect();
      const x = r.left + r.width / 2 - box.left;
      const y = r.top + r.height / 2 - box.top;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      pop.style.left = Math.max(8, Math.min(box.width - w - 8, x - w / 2)) + 'px';
      pop.style.top = (y - h - 14 >= 0 ? y - h - 14 : y + 16) + 'px';
      field('open').focus({ preventScroll: true });
    };
    mapBox.querySelectorAll('.map__link').forEach((link) => link.addEventListener('click', (e) => { e.preventDefault(); openPop(link); }));
    mapBox.querySelector('[data-map-close]').addEventListener('click', closePop);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { const l = openLink; closePop(); if (l) l.focus(); } });
    document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.map__link')) closePop(); });
    field('list').addEventListener('click', (e) => {
      const card = document.querySelector(field('list').getAttribute('href'));
      if (!card) return;
      e.preventDefault();
      closePop();
      showFilter('all');
      card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      card.classList.add('is-flash');
      setTimeout(() => card.classList.remove('is-flash'), 2400);
      card.querySelector('a').focus({ preventScroll: true });
    });
  }

  /* ---------- 9. Projetos: filtro Todos / Bibliotecas / Arquivos ---------- */
  const filters = document.querySelector('[data-filters]');
  function showFilter(type) {
    if (!filters) return;
    filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === type)));
    document.querySelectorAll('[data-cards] > li').forEach((li) => { li.hidden = type !== 'all' && li.dataset.type !== type; });
  }
  if (filters) filters.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showFilter(b.dataset.filter); });

  /* ---------- 10. Página de um projeto: ampliar fotografias ----------
     Abre de imediato (sem animação); setas, teclado (← → Esc) e deslizar o dedo. */
  const gallery = document.querySelector('[data-lightbox]');
  const dialog = document.querySelector('[data-lightbox-dialog]');
  if (gallery && dialog && dialog.showModal) {
    const links = [...gallery.querySelectorAll('a')];
    const img = dialog.querySelector('[data-lb-img]');
    const count = dialog.querySelector('[data-lb-count]');
    let i = 0;
    const show = (n) => {
      i = (n + links.length) % links.length;
      img.src = links[i].dataset.full;
      img.alt = links[i].querySelector('img').alt;
      count.textContent = (i + 1) + ' / ' + links.length;
    };
    links.forEach((a, n) => a.addEventListener('click', (e) => { e.preventDefault(); show(n); dialog.showModal(); }));
    dialog.querySelector('[data-lb-prev]').addEventListener('click', () => show(i - 1));
    dialog.querySelector('[data-lb-next]').addEventListener('click', () => show(i + 1));
    dialog.querySelector('[data-lb-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    dialog.addEventListener('close', () => links[i].focus({ preventScroll: true }));
    let x0 = null;
    dialog.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ---------- 11. Formulário de contacto ----------
     Envia sem recarregar a página; mostra os avisos junto a cada campo. Sem JavaScript, o formulário funciona na mesma. */
  const ctForm = document.querySelector('[data-ct-form]');
  if (ctForm && window.fetch) {
    const formErr = ctForm.querySelector('[data-ct-error]');
    const btn = ctForm.querySelector('[data-ct-submit]');
    const done = document.querySelector('[data-ct-done]');
    const setBusy = (on) => {
      btn.disabled = on;
      btn.querySelector('[data-label-idle]').hidden = on;
      btn.querySelector('[data-label-busy]').hidden = !on;
    };
    const showErrors = (errors) => {
      ctForm.querySelectorAll('[data-err-for]').forEach((p) => {
        const name = p.dataset.errFor;
        const input = ctForm.elements[name];
        p.textContent = errors[name] || '';
        if (errors[name]) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', p.id); }
        else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
      });
      const first = ctForm.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
    };
    ctForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);
      formErr.textContent = '';
      try {
        const res = await fetch(ctForm.action, { method: 'POST', body: new FormData(ctForm), headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (data.ok) {
          ctForm.hidden = true;
          done.hidden = false;
          done.focus();
          return;
        }
        showErrors(data.errors || {});
        formErr.textContent = data.form || '';
      } catch (err) {
        formErr.textContent = ctForm.dataset.netError || '';
      } finally {
        setBusy(false);
      }
    });
    // Ao corrigir um campo, o aviso desaparece
    ctForm.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') !== 'true') return;
      e.target.removeAttribute('aria-invalid');
      const p = ctForm.querySelector('[data-err-for="' + e.target.name + '"]');
      if (p) p.textContent = '';
    });
  }

  /* ---------- 11b. Newsletter (rodapé): inscrição sem recarregar a página ---------- */
  const nlForm = document.querySelector('[data-nl-form]');
  if (nlForm && window.fetch) {
    nlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = nlForm.querySelector('[data-nl-err]');
      err.textContent = '';
      try {
        const res = await fetch(nlForm.action, { method: 'POST', body: new FormData(nlForm), headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (!data.ok) { err.textContent = data.error || ''; return; }
        nlForm.querySelectorAll('[data-nl-fields]').forEach((n) => { n.hidden = true; });
        const ok = nlForm.querySelector('[data-nl-ok]');
        ok.hidden = false;
        ok.focus();
      } catch (x) { err.textContent = nlForm.dataset.netError || ''; }
    });
  }

  /* ---------- 12. Estatísticas próprias (sem cookies) ----------
     Um aviso por página vista e por clique em catálogos, telefone, email e mapa.
     Não conta as visitas do Gonçalo (o painel marca este browser) nem as pré-visualizações do editor. */
  let noTrack = /[?&](vh|design-preview|menutest)=/.test(location.search);
  try { noTrack = noTrack || localStorage.getItem('cb_noTrack') === '1'; } catch (e) { /* sem acesso: conta normalmente */ }
  const beacon = (data) => {
    if (noTrack || !navigator.sendBeacon) return;
    navigator.sendBeacon('/e', new Blob([JSON.stringify(data)], { type: 'text/plain' }));
  };
  beacon({ t: 'v', p: location.pathname, r: document.referrer, w: window.innerWidth, l: document.documentElement.lang.startsWith('en') ? 'en' : 'pt' });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    const name = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (href.includes('indd.adobe.com')) beacon({ t: 'catalogo', n: name || 'Catálogo' });
    else if (href.startsWith('tel:')) beacon({ t: 'telefone', n: location.pathname });
    else if (href.startsWith('mailto:')) beacon({ t: 'email', n: location.pathname });
    else if (href.includes('google.com/maps')) beacon({ t: 'mapa', n: location.pathname });
  });

  // Editor de Design: quando um valor muda, volta a ler as definições
  window.addEventListener('design-change', () => { readSettings(); parallax(); });
  root.classList.add('is-ready');
})();
