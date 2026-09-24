/* Crema ambiental y respuesta táctil. Sin librerías ni acceso a datos del usuario. */
(() => {
  'use strict';
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let paused = document.body.classList.contains('motion-paused');
  const hero = document.querySelector('.hero-visual');
  if (hero) {
    const sweets = document.createElement('div');
    sweets.className = 'confections';
    sweets.setAttribute('aria-hidden', 'true');
    sweets.innerHTML = '<span class="confection cream-rosette"><i></i><i></i><i></i></span><span class="confection clay-macaron"></span><span class="confection sugar-pearl"></span>';
    hero.append(sweets);
  }

  document.querySelectorAll('.product-card').forEach(card => {
    let frame = 0;
    let x = 0, y = 0;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y');
    };
    card.addEventListener('pointermove', event => {
      if (paused || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - .5;
      y = (event.clientY - rect.top) / rect.height - .5;
      if (!frame) frame = requestAnimationFrame(() => {
        card.style.setProperty('--tilt-x', `${-y * 6}deg`);
        card.style.setProperty('--tilt-y', `${x * 7}deg`);
        frame = 0;
      });
    });
    card.addEventListener('pointerleave', reset);
    document.addEventListener('dolce:motion', reset);
  });

  // Solo se ocultan bloques cercanos al viewport después de instalar el observador.
  if ('IntersectionObserver' in window && !paused) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        reveals.unobserve(entry.target);
      }
    }), { threshold: .08 });
    document.querySelectorAll('.section-heading,.essence-copy,.value-grid article,.celebrate .eyebrow,.celebrate h2').forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight) {
        element.classList.add('clay-reveal', 'is-waiting');
        reveals.observe(element);
      }
    });
  }

  const scenes = [];
  let animation = 0, lastTime = 0;
  const pointer = { x: -1000, y: -1000, active: false };
  const transition = document.querySelector('.cream-transition');
  document.querySelectorAll('.hero,.about-hero,.values').forEach(section => {
    const canvas = document.createElement('canvas');
    canvas.className = 'cream-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    section.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }
    const scene = { section, canvas, ctx, visible: false, width: 0, height: 0, drops: [] };
    scenes.push(scene);
    const resize = () => {
      scene.width = section.clientWidth;
      scene.height = section.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(scene.width * ratio);
      canvas.height = Math.round(scene.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = scene.width < 600 ? 8 : 19;
      scene.drops = Array.from({ length: count }, (_, i) => ({
        // Concentradas en los márgenes para conservar limpia la lectura.
        x: (i % 2 ? .95 + Math.random() * .035 : .015 + Math.random() * .025) * scene.width,
        y: Math.random() * scene.height,
        radius: scene.width < 600 ? 4 + Math.random() * 6 : 8 + Math.random() * 13,
        speed: .18 + Math.random() * .28,
        phase: Math.random() * Math.PI * 2,
        vx: 0, vy: 0, stretch: 1
      }));
      draw(scene, 0, 1);
    };
    new ResizeObserver(resize).observe(section);
  });

  function draw(scene, time, dt) {
    const { ctx, width, height } = scene;
    ctx.clearRect(0, 0, width, height);
    if (paused) return;
    const bounds = scene.section.getBoundingClientRect();
    const mx = pointer.x - bounds.left, my = pointer.y - bounds.top;
    scene.drops.forEach(drop => {
      const dx = drop.x - mx, dy = drop.y - my;
      const distance = Math.hypot(dx, dy);
      if (pointer.active && distance < 170) {
        const force = (1 - distance / 170) * .7;
        drop.vx += dx / Math.max(distance, 1) * force;
        drop.vy += dy / Math.max(distance, 1) * force;
      }
      drop.vx *= Math.pow(.94, dt);
      drop.vy *= Math.pow(.94, dt);
      drop.x += (drop.vx + Math.sin(time * .0004 + drop.phase) * .15) * dt;
      drop.y += (drop.speed + drop.vy) * dt;
      if (drop.y > height + 65) drop.y = -65;
      if (drop.y < -80) drop.y = height + 40;
      // Evitar que la deriva se meta debajo del titular; la crema vive en el marco.
      const leftSide = drop.x < width / 2;
      drop.x = leftSide
        ? Math.max(drop.radius, Math.min(width * .048 - drop.radius * .35, drop.x))
        : Math.max(width * .952 + drop.radius * .35, Math.min(width - drop.radius, drop.x));
      drop.stretch += (1.2 + Math.min(1.1, Math.hypot(drop.vx, drop.vy) * .13) - drop.stretch) * .08;
      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.rotate(Math.sin(time * .0003 + drop.phase) * .25 - drop.vx * .04);
      ctx.scale(1, drop.stretch);
      const r = drop.radius;
      const cream = ctx.createRadialGradient(-r * .3, -r * .4, 0, 0, 0, r * 1.25);
      cream.addColorStop(0, '#fffbea');
      cream.addColorStop(.48, '#efe0bf');
      cream.addColorStop(1, '#bea275');
      ctx.globalAlpha = scene.section.classList.contains('about-hero') ? .55 : .78;
      ctx.fillStyle = cream;
      ctx.shadowColor = '#17261935'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
      // Gota asimétrica de crema: una punta que se estira y una base redondeada.
      ctx.beginPath();
      ctx.moveTo(-r * .12, -r * 1.45);
      ctx.bezierCurveTo(r * .12, -r * .6, r * 1.15, -r * .35, r * .84, r * .46);
      ctx.bezierCurveTo(r * .58, r * 1.16, -r * .74, r * 1.02, -r * .86, r * .35);
      ctx.bezierCurveTo(-r * 1.03, -r * .35, -r * .27, -r * .63, -r * .12, -r * 1.45);
      ctx.fill();
      ctx.restore();
    });
  }
  function tick(time) {
    animation = 0;
    if (paused || document.hidden) return;
    if (time - lastTime >= 32) {
      const dt = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;
      scenes.forEach(scene => { if (scene.visible) draw(scene, time, dt); });
    }
    if (scenes.some(scene => scene.visible)) animation = requestAnimationFrame(tick);
  }
  function start() {
    if (!animation && !paused && !document.hidden && scenes.some(scene => scene.visible)) {
      lastTime = performance.now();
      animation = requestAnimationFrame(tick);
    }
  }
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => { scenes.find(scene => scene.section === entry.target).visible = entry.isIntersecting; });
      start();
    });
    scenes.forEach(scene => visibility.observe(scene.section));
  } else { scenes.forEach(scene => { scene.visible = true; }); start(); }
  addEventListener('pointermove', event => {
    pointer.active = finePointer.matches && !paused;
    pointer.x = event.clientX; pointer.y = event.clientY;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(animation); animation = 0;
    if (!document.hidden) start();
  });
  document.addEventListener('dolce:motion', event => {
    paused = event.detail.paused;
    cancelAnimationFrame(animation); animation = 0;
    if (paused) {
      scenes.forEach(scene => scene.ctx.clearRect(0, 0, scene.width, scene.height));
      document.querySelectorAll('.is-waiting').forEach(element => element.classList.remove('is-waiting'));
    } else start();
  });
  let scrollFrame = 0;
  addEventListener('scroll', () => {
    if (paused || !transition || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const rect = transition.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) {
        transition.style.setProperty('--drip', String(.6 + Math.min(1, Math.max(0, 1 - rect.top / innerHeight)) * .65));
      }
    });
  }, { passive: true });
})();
