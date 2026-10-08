/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Candidate {
  id: string;
  severityScore: number;
}

/** Share of the slots handed out round-robin, whatever the severity score. */
export const ROTATING_SHARE = 0.2;

const byId = <T extends Candidate>(a: T, b: T): number => a.id.localeCompare(b.id);

/** Highest score first; within one score the pick rotates with `tick`. */
const pickByPriority = <T extends Candidate>({
  candidates,
  limit,
  tick,
}: {
  candidates: readonly T[];
  limit: number;
  tick: number;
}): T[] => {
  const tiers = new Map<number, T[]>();
  candidates.forEach((candidate) => {
    tiers.set(candidate.severityScore, [...(tiers.get(candidate.severityScore) ?? []), candidate]);
  });

  const selected: T[] = [];
  [...tiers.entries()]
    .sort(([a], [b]) => b - a)
    .forEach(([, tier]) => {
      const remaining = limit - selected.length;
      if (remaining <= 0) {
        return;
      }
      const ordered = tier.toSorted(byId);
      if (ordered.length <= remaining) {
        selected.push(...ordered);
        return;
      }
      const start = (tick * remaining) % ordered.length;
      selected.push(...[...ordered.slice(start), ...ordered.slice(0, start)].slice(0, remaining));
    });

  return selected;
};

/**
 * Picks up to `limit` candidates for this run. Most slots go to the highest severity scores
 * (rotating within a score, so a still-breaching series that writes nothing does not keep its
 * slot). A fixed share (`ROTATING_SHARE`) walks the whole list round-robin instead, so a series
 * under a full cap of higher scores is still evaluated, at least once every
 * ceil(candidates / rotating slots) ticks.
 */
export const selectForEvaluation = <T extends Candidate>({
  candidates,
  limit,
  tick,
}: {
  candidates: readonly T[];
  limit: number;
  tick: number;
}): T[] => {
  if (limit <= 0) {
    return [];
  }

  const rotatingSlots = Math.floor(limit * ROTATING_SHARE);
  const priority = pickByPriority({
    candidates,
    limit: candidates.length <= limit ? limit : limit - rotatingSlots,
    tick,
  });
  if (candidates.length <= limit || rotatingSlots === 0) {
    return priority;
  }

  const taken = new Set(priority);
  const everyone = candidates.toSorted(byId);
  const start = (tick * rotatingSlots) % everyone.length;
  const rotating: T[] = [];
  for (let step = 0; step < everyone.length && rotating.length < rotatingSlots; step++) {
    const candidate = everyone[(start + step) % everyone.length];
    if (!taken.has(candidate)) {
      rotating.push(candidate);
    }
  }

  return [...priority, ...rotating];
};
