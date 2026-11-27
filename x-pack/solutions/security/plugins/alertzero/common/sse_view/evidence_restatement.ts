/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SseDetection } from './derive_detections';

/**
 * Openings of the `evidence_for` bullets the hunt mapper writes to restate a hit count. The
 * mapper starts those sentences with these exact strings, and a renderer that shows
 * `detections[]` can hide the one a detection row already tells, so the wording is coupled
 * here, in one place, rather than between the mapper and a regex in the card.
 */
export const SSE_TIER1_HIT_BULLET_PREFIX = 'IOC Hunt matched ';
export const SSE_TIER2_HIT_BULLET_PREFIX = 'Behavior Hunt executed ';
export const SSE_CONFIRMED_HIT_BULLET_PREFIX = 'Environment hit confirmed';

/**
 * Hides the hit-count restatements that `detections` already covers, for display only: the
 * Tier 1 bullet when an aggregate-backed IOC detection exists, the Tier 2 bullet when a
 * behavior detection exists, the generic confirmation when there is any detection. A bullet
 * whose tier has no detection row stays, since nothing else on the card tells that part. So
 * does the Tier 1 bullet when every IOC row is `from_sample`: such a row counts only the
 * cited events, not `tier1.counts.total_hits`, and would otherwise leave the run's total off
 * the card. The stored payload is untouched; packaging and summaries keep reading every bullet.
 */
export const filterRestatedEvidence = (
  evidenceFor: readonly string[],
  detections: readonly SseDetection[]
): string[] => {
  if (detections.length === 0) return [...evidenceFor];
  const hasIoc = detections.some(
    (detection) => detection.kind === 'ioc' && detection.from_sample !== true
  );
  const hasBehavior = detections.some((detection) => detection.kind === 'behavior');
  return evidenceFor.filter((item) => {
    if (item.startsWith(SSE_TIER1_HIT_BULLET_PREFIX)) return !hasIoc;
    if (item.startsWith(SSE_TIER2_HIT_BULLET_PREFIX)) return !hasBehavior;
    if (item.startsWith(SSE_CONFIRMED_HIT_BULLET_PREFIX)) return false;
    return true;
  });
};
