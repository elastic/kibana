/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-shot celebration overlay for the AlertZero enable moment.
 *
 * Implemented imperatively on purpose: enabling transitions the app out of the
 * onboarding gate, so any React state tied to the click site unmounts mid-
 * animation. A self-cleaning <canvas> on document.body survives the route
 * change, animates for ~2.6s, and removes itself. No third-party dependency.
 */

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  shape: 'rect' | 'circle';
}

/** EUI-flavored celebration palette. */
const CONFETTI_COLORS = ['#00BFB3', '#36A2EF', '#7B61FF', '#FEC514', '#F04E98', '#69E07A'] as const;
const PARTICLE_COUNT = 140;
const DURATION_MS = 2600;
const CANVAS_TEST_SUBJ = 'alertZeroConfettiCanvas';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const spawnParticle = (
  originX: number,
  originY: number,
  angle: number,
  index: number
): ConfettiParticle => {
  // Spread angles slightly so each cannon reads as a burst, not a line.
  const spread = (Math.random() - 0.5) * 0.5;
  // Tuned so the apex lands in the upper third of the viewport (~800px at
  // vy≈16, g=0.16): corner cannons that top out low read as confetti "stuck"
  // at the bottom of the screen instead of a celebration.
  const speed = 13 + Math.random() * 6;
  return {
    x: originX,
    y: originY,
    vx: Math.cos(angle + spread) * speed,
    vy: Math.sin(angle + spread) * speed,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    width: 6 + Math.random() * 5,
    height: 8 + Math.random() * 6,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    shape: Math.random() > 0.75 ? 'circle' : 'rect',
  };
};

/**
 * Fires a two-cannon confetti burst. Returns true when an animation was
 * started, false when it was skipped (reduced motion, no 2D context, or a
 * non-DOM environment). Safe to call repeatedly; each call owns its canvas.
 */
export const fireConfetti = (): boolean => {
  if (typeof document === 'undefined' || prefersReducedMotion()) {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-test-subj', CANVAS_TEST_SUBJ);
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    canvas.remove();
    return false;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  // Two cannons at the bottom corners shooting inward and up.
  const particles: ConfettiParticle[] = [];
  const half = Math.floor(PARTICLE_COUNT / 2);
  for (let i = 0; i < half; i++) {
    particles.push(spawnParticle(0, window.innerHeight, -Math.PI / 3, i));
    particles.push(spawnParticle(window.innerWidth, window.innerHeight, (-2 * Math.PI) / 3, i));
  }

  const startedAt = performance.now();
  let frame = 0;

  const step = (): void => {
    const elapsed = performance.now() - startedAt;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const particle of particles) {
      // Physics normalized to ~60fps steps.
      particle.vy += 0.16; // gravity
      particle.vx *= 0.99; // horizontal drag
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      const fade = Math.max(0, 1 - Math.max(0, elapsed - (DURATION_MS - 600)) / 600);
      if (fade <= 0) continue;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      if (particle.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, particle.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      }
      ctx.restore();
    }

    const offScreen = particles.every((p) => p.y > window.innerHeight + 60);
    if (elapsed < DURATION_MS && !offScreen) {
      frame = requestAnimationFrame(step);
    } else {
      canvas.remove();
    }
  };

  frame = requestAnimationFrame(step);

  // Safety net: if the tab is backgrounded, rAF never fires — clean up on a timer.
  window.setTimeout(() => {
    cancelAnimationFrame(frame);
    canvas.remove();
  }, DURATION_MS + 500);

  return true;
};
