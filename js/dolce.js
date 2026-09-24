(() => {
  'use strict';
  const config = window.DOLCE_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const toggle = $('.nav-toggle');
  const navigation = $('#navigation');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation?.classList.contains('is-open')) {
      navigation.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  try { userPaused = localStorage.getItem('dolce-motion') === 'paused'; } catch {}
  let ticking = false;
  const ritual = $('.ritual');
  const art = $('.ritual-art');
  const updateScroll = () => {
    ticking = false;
    if (!ritual || userPaused || motionQuery.matches) return;
    const rect = ritual.getBoundingClientRect();
    if (rect.top > innerHeight || rect.bottom < 0) return;
    const progress = Math.min(1, Math.max(0, (150 - rect.top) / Math.max(1, rect.height - innerHeight)));
    art.style.setProperty('--progress', progress.toFixed(4));
  };
  const scheduleScroll = () => {
    if (!ticking && ritual) { ticking = true; requestAnimationFrame(updateScroll); }
  };
  const applyMotion = () => {
    const paused = userPaused || motionQuery.matches;
    document.body.classList.toggle('motion-paused', paused);
    $('.motion-toggle').setAttribute('aria-pressed', String(paused));
    $('.motion-toggle').textContent = motionQuery.matches ? 'Movimiento reducido del sistema' : paused ? 'Activar movimiento' : 'Pausar movimiento';
    $('.motion-toggle').disabled = motionQuery.matches;
    document.dispatchEvent(new CustomEvent('dolce:motion', { detail: { paused } }));
    if (!paused) scheduleScroll();
  };
  $('.motion-toggle')?.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('dolce-motion', userPaused ? 'paused' : 'active'); } catch {}
    applyMotion();
  });
  motionQuery.addEventListener('change', applyMotion);
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', scheduleScroll, { passive: true });
  applyMotion();
  $('.cake-toggle')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const exploded = $('.hero-visual').classList.toggle('exploded');
    button.setAttribute('aria-pressed', String(exploded));
    button.textContent = exploded ? 'Armar el pastel ↙' : 'Desarmar el pastel ↗';
  });

  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    $$('.product-card').forEach(card => {
      card.hidden = button.dataset.filter !== 'Todos' && card.dataset.category !== button.dataset.filter;
      if (!card.hidden) count++;
    });
    $('#filter-status').textContent = `${count} productos en ${button.dataset.filter.toLowerCase()}.`;
  }));

  $$('[data-image]').forEach(frame => {
    const source = config.images?.[frame.dataset.image];
    if (!source) return;
    const image = new Image();
    image.alt = frame.querySelector('.frame-caption').textContent;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      frame.classList.add('has-photo');
      frame.removeAttribute('role');
      frame.removeAttribute('aria-label');
    });
    image.addEventListener('error', () => image.remove());
    image.src = source;
    frame.append(image);
  });
  $$('[data-business]').forEach(element => {
    if (config[element.dataset.business]) element.textContent = config[element.dataset.business];
  });
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  $$('input[type="date"]').forEach(input => { input.min = localDate; });
  const product = new URLSearchParams(location.search).get('producto');
  if (product && $('#product-select')) {
    const option = [...$('#product-select').options].find(item => item.value === product);
    if (option) $('#product-select').value = option.value;
  }

  const dialog = $('#message-dialog');
  $('.dialog-close')?.addEventListener('click', () => dialog.close());
  const labels = { nombre: 'Nombre', fecha: 'Fecha deseada', personas: 'Personas / porciones', producto: 'Producto', entrega: 'Entrega', ocasion: 'Ocasión', detalles: 'Detalles' };
  $$('[data-request]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const lines = [`¡Hola, Dolce Florencia! Quisiera conversar sobre lo siguiente: ${form.dataset.request.toLowerCase()}.`, ''];
    for (const [key, value] of new FormData(form)) {
      const clean = String(value).trim();
      if (clean) lines.push(`${labels[key] || key}: ${clean}`);
    }
    lines.push('', '¿Podrían ayudarme a confirmar los detalles?');
    const message = lines.join('\n');
    const phone = String(config.whatsapp || '').replace(/\D/g, '');
    if (!config.demo && /^591\d{8}$/.test(phone)) {
      // Solo prepara la conversación. La persona revisa y envía en WhatsApp.
      window.location.assign(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
      return;
    }
    $('#message-text').value = message;
    $('#message-status').textContent = 'Estamos preparando nuestro canal de WhatsApp. Por ahora puedes copiar tu consulta; todavía no se ha enviado ni confirmado un pedido.';
    $('#copy-status').textContent = '';
    dialog.showModal();
  }));
  $('#copy-message')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#message-text').value);
      $('#copy-status').textContent = 'Mensaje copiado.';
    } catch {
      $('#message-text').focus();
      $('#message-text').select();
      $('#copy-status').textContent = 'Seleccionamos el mensaje. Puedes copiarlo con el menú del dispositivo o Ctrl+C.';
    }
  });
})();
