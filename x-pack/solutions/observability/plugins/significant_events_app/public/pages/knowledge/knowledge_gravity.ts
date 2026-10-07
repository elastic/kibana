/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  knowledgeHash,
  type KnowledgeGraphLayout,
  type KnowledgeGraphNode,
} from './knowledge_model';

export interface KnowledgeParticle {
  node: KnowledgeGraphNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  radius: number;
}

/** Preserves existing momentum and lets newly learned KIs fall into their connected neighborhood. */
export const reconcileKnowledgeParticles = (
  graph: KnowledgeGraphLayout,
  previous: Map<string, KnowledgeParticle>,
  arrivals = false
): Map<string, KnowledgeParticle> => {
  const next = new Map<string, KnowledgeParticle>();
  for (const node of graph.nodes) {
    const existing = previous.get(node.id);
    if (existing) {
      next.set(node.id, {
        ...existing,
        node,
        radius: Number.isFinite(existing.radius) ? existing.radius : existing.node.radius,
      });
      continue;
    }
    const seed = knowledgeHash(`${node.id}:arrival`);
    const angle = ((seed % 1000) * Math.PI * 2) / 1000;
    const entering = arrivals || previous.size > 0;
    const orbit = 0.39 + ((seed % 109) / 109) * 0.07;
    const x = entering
      ? graph.width / 2 + Math.cos(angle) * graph.width * orbit
      : node.x + Math.cos(angle) * 45;
    const y = entering
      ? graph.height / 2 + Math.sin(angle) * graph.height * orbit
      : node.y + Math.sin(angle) * 45;
    next.set(node.id, {
      node,
      x,
      y,
      radius: Math.min(3, node.radius),
      vx: -Math.sin(angle) * 1.8,
      vy: Math.cos(angle) * 1.8,
      pinned: false,
    });
  }
  return next;
};

/** Applies local charge, collision, link springs and gentle elliptical gravity in one frame. */
export const stepKnowledgeGravity = (
  particles: Map<string, KnowledgeParticle>,
  graph: KnowledgeGraphLayout,
  alpha: number
): number => {
  const cells = new Map<string, KnowledgeParticle[]>();
  const cellSize = 100;
  for (const particle of particles.values()) {
    const key = `${Math.floor(particle.x / cellSize)},${Math.floor(particle.y / cellSize)}`;
    const cell = cells.get(key);
    if (cell) cell.push(particle);
    else cells.set(key, [particle]);
  }
  for (const particle of particles.values()) {
    const cellX = Math.floor(particle.x / cellSize);
    const cellY = Math.floor(particle.y / cellSize);
    for (let offsetX = -1; offsetX <= 1; offsetX++)
      for (let offsetY = -1; offsetY <= 1; offsetY++)
        for (const other of cells.get(`${cellX + offsetX},${cellY + offsetY}`) ?? []) {
          if (particle === other) continue;
          const dx = particle.x - other.x || 0.01;
          const dy = particle.y - other.y || 0.01;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > 16000) continue;
          const distance = Math.sqrt(distanceSquared);
          const separation = particle.node.radius + other.node.radius + 20;
          const charge = Math.min(
            1.8,
            (150 + other.node.radius * 10) / Math.max(20, distanceSquared)
          );
          const collision = Math.max(0, separation - distance) * 0.14;
          particle.vx += (dx / distance) * (charge * alpha + collision);
          particle.vy += (dy / distance) * (charge * alpha + collision);
        }
    const homeForce = particle.node.anchor ? 0.045 : 0.022;
    particle.vx += (particle.node.x - particle.x) * homeForce * alpha;
    particle.vy += (particle.node.y - particle.y) * homeForce * alpha;
    particle.vx += (graph.width / 2 - particle.x) * 0.00015 * alpha;
    particle.vy += (graph.height / 2 - particle.y) * 0.0003 * alpha;
    // Soft bounds preserve a readable galaxy while letting the springs choose local positions.
    particle.vx += (Math.max(35, Math.min(graph.width - 35, particle.x)) - particle.x) * 0.02;
    particle.vy += (Math.max(35, Math.min(graph.height - 35, particle.y)) - particle.y) * 0.02;
  }
  for (const edge of graph.edges) {
    const source = particles.get(edge.source);
    const target = particles.get(edge.target);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const length = (edge.kind === 'context' ? 42 : 70) + source.node.radius + target.node.radius;
    const force = ((distance - length) / distance) * 0.016 * alpha;
    const sourceWeight = 1 / Math.sqrt(source.node.degree + 1);
    const targetWeight = 1 / Math.sqrt(target.node.degree + 1);
    source.vx += dx * force * sourceWeight;
    source.vy += dy * force * sourceWeight;
    target.vx -= dx * force * targetWeight;
    target.vy -= dy * force * targetWeight;
  }
  let energy = 0;
  for (const particle of particles.values()) {
    const radiusDelta = particle.node.radius - particle.radius;
    particle.radius += radiusDelta * 0.07;
    energy += radiusDelta * radiusDelta * 0.04;
    if (particle.pinned) {
      particle.vx = 0;
      particle.vy = 0;
      continue;
    }
    particle.vx *= 0.79;
    particle.vy *= 0.79;
    particle.x += Math.max(-9, Math.min(9, particle.vx));
    particle.y += Math.max(-9, Math.min(9, particle.vy));
    energy += particle.vx * particle.vx + particle.vy * particle.vy;
  }
  return energy / Math.max(1, particles.size);
};
