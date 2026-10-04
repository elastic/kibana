/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lossless-fork check for a promotion (`D7`).
 *
 * The incident must carry every pre-fork investigation event forward unchanged
 * and append exactly one promotion event. Counting events was the original
 * check and it is not sufficient: a fork that drops one prior event and writes
 * another in its place keeps the total equal, so the integrity gate passed on a
 * lossy fork. Prior events are compared as a multiset of (type, summary)
 * signatures instead, which also catches a duplicate collapse.
 */

export interface TimelineEventLike {
  type?: string;
  summary?: string;
}

export const eventSignature = (event?: TimelineEventLike): string =>
  `${event?.type ?? ''}|${event?.summary ?? ''}`;

export const countBySignature = (signatures: string[]): Record<string, number> =>
  signatures.reduce<Record<string, number>>((acc, signature) => {
    acc[signature] = (acc[signature] ?? 0) + 1;
    return acc;
  }, {});

/**
 * Prior events the incident does not carry forward, as signatures.
 *
 * Multiset comparison: one occurrence short is a loss, so
 * `prior = [A, A]` against `incident = [A]` reports `A` missing.
 */
export const missingPriorEvents = (
  prior: TimelineEventLike[],
  incident: TimelineEventLike[]
): string[] => {
  const priorCounts = countBySignature(prior.map(eventSignature));
  const incidentCounts = countBySignature(incident.map(eventSignature));

  return Object.keys(priorCounts).filter(
    (signature) => (incidentCounts[signature] ?? 0) < priorCounts[signature]
  );
};

/**
 * True when the incident is a lossless fork: every prior event present
 * unchanged, and exactly one event appended (the promotion audit event).
 */
export const carriesAllPriorEvents = (
  prior: TimelineEventLike[],
  incident: TimelineEventLike[]
): boolean =>
  prior.length > 0 &&
  missingPriorEvents(prior, incident).length === 0 &&
  incident.length === prior.length + 1;
