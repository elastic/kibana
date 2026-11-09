/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { iocOfDetection, type SseDetection } from './derive_detections';

/** Characters a summary may spend, matching `summary`'s own cap on the SSE schema. */
const MAX_SUMMARY_LENGTH = 512;

export interface BuildSummaryOptions {
  /** When set, the scoped behavior detection for this technique always leads. */
  techniqueId?: string;
  /** Tier 1's wide affected-host count, for the IOC leader line (never a per-IOC count). */
  tier1Counts?: { affected_hosts?: number };
}

const plural = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

/** `{technique_id} {technique_name}: {total} event(s) on {host_count} host(s)`, or just the id when the name is absent. */
const summarizeBehavior = (detection: SseDetection): string => {
  const techniqueId = detection.technique_id ?? '';
  if (!detection.technique_name) {
    return techniqueId;
  }
  const hostsPart =
    detection.host_count !== undefined ? ` on ${plural(detection.host_count, 'host')}` : '';
  return `${techniqueId} ${detection.technique_name}: ${plural(
    detection.total,
    'event'
  )}${hostsPart}`;
};

/** `{type} {value} seen {count}x on {affected_hosts} host(s)`, using the wide Tier 1 host count, never a per-IOC one. */
const summarizeIoc = (
  detection: SseDetection,
  tier1Counts: BuildSummaryOptions['tier1Counts']
): string => {
  const parsed = iocOfDetection(detection);
  const type = parsed?.type ?? detection.field ?? 'indicator';
  const value = parsed?.value ?? detection.matched_on[0]?.value ?? '';
  const hostsPart =
    tier1Counts?.affected_hosts !== undefined
      ? ` on ${plural(tier1Counts.affected_hosts, 'host')}`
      : '';
  return `${type} ${value} seen ${detection.total}x${hostsPart}`;
};

const summarize = (
  detection: SseDetection,
  tier1Counts: BuildSummaryOptions['tier1Counts']
): string =>
  detection.kind === 'behavior'
    ? summarizeBehavior(detection)
    : summarizeIoc(detection, tier1Counts);

/** Behaviors and strong-IOC detections lead over weak-IOC ones; ties break by `total` descending. */
const isHighRank = (detection: SseDetection): boolean =>
  detection.kind === 'behavior' || detection.basis === 'ioc_strong';

const compareDetections = (a: SseDetection, b: SseDetection): number => {
  const rankA = isHighRank(a) ? 0 : 1;
  const rankB = isHighRank(b) ? 0 : 1;
  return rankA !== rankB ? rankA - rankB : b.total - a.total;
};

/**
 * Builds the SSE's hit-centric `summary` headline from its
 * `detections[]`: one leader line plus "and N more" when there is more than
 * one detection. When `techniqueId` is set, the scoped behavior detection for
 * that technique always leads (this entry is about that technique); otherwise
 * the leader is the highest-ranked detection by {@link compareDetections}.
 *
 * Never reports an id, the hypothesis, or an index name: only the IOC
 * type/value or technique id/name, counts, and host/event tallies.
 */
export const buildSummary = (
  detections: readonly SseDetection[],
  options: BuildSummaryOptions = {}
): string => {
  if (detections.length === 0) return '';
  const { techniqueId, tier1Counts } = options;

  const scopedLeader = techniqueId
    ? detections.find(
        (detection) => detection.kind === 'behavior' && detection.technique_id === techniqueId
      )
    : undefined;
  const leader = scopedLeader ?? [...detections].sort(compareDetections)[0];

  const leaderText = summarize(leader, tier1Counts);
  const others = detections.length - 1;
  const summary = others > 0 ? `${leaderText} and ${others} more` : leaderText;

  return summary.slice(0, MAX_SUMMARY_LENGTH);
};
