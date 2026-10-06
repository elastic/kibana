/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTinesAgent, TinesLink } from './types';

export interface TinesAgentAdjacency {
  incoming: Map<number, number[]>;
  outgoing: Map<number, number[]>;
}

/**
 * Builds adjacency lists from Tines `links` (`source`/`receiver` agent indices).
 * Links that reference unknown agent indices are ignored.
 */
export const buildAgentAdjacency = (
  agents: ParsedTinesAgent[],
  links: TinesLink[]
): TinesAgentAdjacency => {
  const knownIndexes = new Set(agents.map((agent) => agent.index));
  const incoming = new Map<number, number[]>();
  const outgoing = new Map<number, number[]>();

  for (const agent of agents) {
    incoming.set(agent.index, []);
    outgoing.set(agent.index, []);
  }

  for (const link of links) {
    if (knownIndexes.has(link.source) && knownIndexes.has(link.receiver)) {
      incoming.get(link.receiver)?.push(link.source);
      outgoing.get(link.source)?.push(link.receiver);
    }
  }

  return { incoming, outgoing };
};

/**
 * Returns agent indexes in a valid execution order derived from `links`.
 * Throws when a cycle is detected.
 */
export const getTopologicalAgentOrder = (
  agents: ParsedTinesAgent[],
  links: TinesLink[]
): number[] => {
  if (agents.length === 0) {
    return [];
  }

  const { incoming, outgoing } = buildAgentAdjacency(agents, links);
  const inDegree = new Map<number, number>();

  for (const agent of agents) {
    inDegree.set(agent.index, incoming.get(agent.index)?.length ?? 0);
  }

  // Prefer original agent order among equal in-degree roots for stable output.
  const queue = agents
    .filter((agent) => (inDegree.get(agent.index) ?? 0) === 0)
    .map((agent) => agent.index);

  const ordered: number[] = [];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current !== undefined && !visited.has(current)) {
      visited.add(current);
      ordered.push(current);

      for (const next of outgoing.get(current) ?? []) {
        const nextDegree = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, nextDegree);
        if (nextDegree === 0 && !visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  if (ordered.length !== agents.length) {
    const cyclicIndexes = agents.map((agent) => agent.index).filter((index) => !visited.has(index));
    throw new Error(
      `Cycle detected in Tines story links involving agent indexes: ${cyclicIndexes.join(', ')}`
    );
  }

  return ordered;
};
