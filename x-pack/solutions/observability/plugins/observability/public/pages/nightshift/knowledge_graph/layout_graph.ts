/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position, type Edge, type Node } from '@xyflow/react';
import type { KiNodeData } from './types';

interface Vec2 {
  x: number;
  y: number;
}

/**
 * Force-directed layout using velocity Verlet integration.
 * Optimized for hub-and-spoke topologies with many leaf nodes.
 */
export function applyDagreLayout(
  nodes: Array<Node<KiNodeData>>,
  edges: Edge[]
): Array<Node<KiNodeData>> {
  if (nodes.length === 0) return nodes;
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 }, sourcePosition: Position.Right, targetPosition: Position.Left }];
  }

  const nodeIndex = new Map<string, number>();
  nodes.forEach((n, i) => nodeIndex.set(n.id, i));

  // Build adjacency and compute degree
  const degree = new Array(nodes.length).fill(0);
  const adjacency: number[][] = nodes.map(() => []);

  for (const edge of edges) {
    const si = nodeIndex.get(edge.source);
    const ti = nodeIndex.get(edge.target);
    if (si !== undefined && ti !== undefined) {
      degree[si]++;
      degree[ti]++;
      adjacency[si].push(ti);
      adjacency[ti].push(si);
    }
  }

  // Initialize positions: place high-degree nodes (hubs) spaced out,
  // connected nodes near their hub, isolated nodes in a separate area
  const positions: Vec2[] = new Array(nodes.length);
  const velocities: Vec2[] = nodes.map(() => ({ x: 0, y: 0 }));

  const maxDegree = Math.max(...degree, 1);
  const hubThreshold = Math.max(5, maxDegree * 0.3);

  // Sort nodes by degree descending for initial placement
  const sortedIndices = [...Array(nodes.length).keys()].sort((a, b) => degree[b] - degree[a]);

  // Place hubs in a circle first
  const hubs = sortedIndices.filter((i) => degree[i] >= hubThreshold);
  const nonHubs = sortedIndices.filter((i) => degree[i] > 0 && degree[i] < hubThreshold);
  const isolated = sortedIndices.filter((i) => degree[i] === 0);

  const hubRadius = Math.max(300, hubs.length * 80);
  hubs.forEach((idx, i) => {
    const angle = (2 * Math.PI * i) / Math.max(hubs.length, 1);
    positions[idx] = {
      x: Math.cos(angle) * hubRadius,
      y: Math.sin(angle) * hubRadius,
    };
  });

  // Place connected non-hubs near their highest-degree neighbor
  for (const idx of nonHubs) {
    const neighbors = adjacency[idx];
    if (neighbors.length > 0) {
      const bestNeighbor = neighbors.reduce((best, n) => (degree[n] > degree[best] ? n : best), neighbors[0]);
      if (positions[bestNeighbor]) {
        const jitter = () => (Math.random() - 0.5) * 150;
        positions[idx] = {
          x: positions[bestNeighbor].x + jitter(),
          y: positions[bestNeighbor].y + jitter(),
        };
      } else {
        positions[idx] = { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 600 };
      }
    } else {
      positions[idx] = { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 600 };
    }
  }

  // Place isolated nodes in a grid off to the side
  const isoStartX = hubRadius + 400;
  const isoCols = Math.ceil(Math.sqrt(isolated.length));
  isolated.forEach((idx, i) => {
    positions[idx] = {
      x: isoStartX + (i % isoCols) * 60,
      y: -((isoCols * 60) / 2) + Math.floor(i / isoCols) * 60,
    };
  });

  // Force simulation
  const iterations = 120;
  const repulsionStrength = 800;
  const attractionStrength = 0.08;
  const idealEdgeLength = 100;
  const damping = 0.9;
  const minDistance = 50;

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations;
    const forces: Vec2[] = nodes.map(() => ({ x: 0, y: 0 }));

    // Repulsion (only between nearby nodes for performance)
    for (let i = 0; i < nodes.length; i++) {
      if (isolated.includes(i)) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (isolated.includes(j)) continue;
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist > 500) continue;

        const force = (repulsionStrength * cooling) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[i].x += fx;
        forces[i].y += fy;
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const si = nodeIndex.get(edge.source);
      const ti = nodeIndex.get(edge.target);
      if (si === undefined || ti === undefined) continue;

      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - idealEdgeLength;
      const force = displacement * attractionStrength * cooling;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces[si].x += fx;
      forces[si].y += fy;
      forces[ti].x -= fx;
      forces[ti].y -= fy;
    }

    // Apply forces with velocity
    for (let i = 0; i < nodes.length; i++) {
      if (isolated.includes(i)) continue;
      velocities[i].x = (velocities[i].x + forces[i].x) * damping;
      velocities[i].y = (velocities[i].y + forces[i].y) * damping;

      const speed = Math.sqrt(velocities[i].x ** 2 + velocities[i].y ** 2);
      const maxSpeed = 20 * cooling;
      if (speed > maxSpeed) {
        velocities[i].x = (velocities[i].x / speed) * maxSpeed;
        velocities[i].y = (velocities[i].y / speed) * maxSpeed;
      }

      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
    }
  }

  return nodes.map((node, i) => ({
    ...node,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    position: {
      x: Math.round(positions[i].x),
      y: Math.round(positions[i].y),
    },
  }));
}
