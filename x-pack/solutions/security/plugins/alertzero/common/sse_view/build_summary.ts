/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { iocOfDetection, type SseDetection } from './derive_detections';

/** Characters a summary may spend, matching `summary`'s own cap on the SSE schema. */
const MAX_SUMMARY_LENGTH = 512;

export interface BuildSummaryOptions {
  /** When set, the scoped behavior detection for this technique always leads. */
  techniqueId?: string;
}

/**
 * `{technique_id} {technique_name}: {total} event(s) on {host_count} host(s)`, or just the
 * id when the name is absent. The with-hosts and without-hosts variants are whole messages,
 * so a translator can place the host clause anywhere in the sentence.
 */
const summarizeBehavior = (detection: SseDetection): string => {
  const techniqueId = detection.technique_id ?? '';
  if (!detection.technique_name) {
    return techniqueId;
  }
  // Inline `values` literals: the i18n checker reads them statically.
  if (detection.host_count === undefined) {
    return i18n.translate('xpack.alertzero.sseView.summary.behavior', {
      defaultMessage:
        '{techniqueId} {techniqueName}: {count, plural, one {# event} other {# events}}',
      values: { techniqueId, techniqueName: detection.technique_name, count: detection.total },
    });
  }
  if (detection.hosts_truncated) {
    // The producer kept only the first hosts it saw, so the count is a floor.
    return i18n.translate('xpack.alertzero.sseView.summary.behaviorOnAtLeastHosts', {
      defaultMessage:
        '{techniqueId} {techniqueName}: {count, plural, one {# event} other {# events}} on {hostCount}+ hosts',
      values: {
        techniqueId,
        techniqueName: detection.technique_name,
        count: detection.total,
        hostCount: detection.host_count,
      },
    });
  }
  return i18n.translate('xpack.alertzero.sseView.summary.behaviorOnHosts', {
    defaultMessage:
      '{techniqueId} {techniqueName}: {count, plural, one {# event} other {# events}} on {hostCount, plural, one {# host} other {# hosts}}',
    values: {
      techniqueId,
      techniqueName: detection.technique_name,
      count: detection.total,
      hostCount: detection.host_count,
    },
  });
};

/**
 * `{type} {value} seen {count}x on {host_count} host(s)`, from this IOC's own host count.
 * The report-wide affected-host count would credit this IOC with hosts other IOCs matched.
 */
const summarizeIoc = (detection: SseDetection): string => {
  const parsed = iocOfDetection(detection);
  const type = parsed?.type ?? detection.field ?? 'indicator';
  const value = parsed?.value ?? detection.matched_on[0]?.value ?? '';
  if (detection.host_count === undefined) {
    return i18n.translate('xpack.alertzero.sseView.summary.ioc', {
      defaultMessage: '{type} {value} seen {count}x',
      values: { type, value, count: detection.total },
    });
  }
  if (detection.hosts_truncated) {
    return i18n.translate('xpack.alertzero.sseView.summary.iocOnAtLeastHosts', {
      defaultMessage: '{type} {value} seen {count}x on {hostCount}+ hosts',
      values: { type, value, count: detection.total, hostCount: detection.host_count },
    });
  }
  return i18n.translate('xpack.alertzero.sseView.summary.iocOnHosts', {
    defaultMessage:
      '{type} {value} seen {count}x on {hostCount, plural, one {# host} other {# hosts}}',
    values: { type, value, count: detection.total, hostCount: detection.host_count },
  });
};

const summarize = (detection: SseDetection): string =>
  detection.kind === 'behavior' ? summarizeBehavior(detection) : summarizeIoc(detection);

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
  const { techniqueId } = options;

  const scopedLeader = techniqueId
    ? detections.find(
        (detection) => detection.kind === 'behavior' && detection.technique_id === techniqueId
      )
    : undefined;
  const leader = scopedLeader ?? [...detections].sort(compareDetections)[0];

  const leaderText = summarize(leader);
  const others = detections.length - 1;
  const summary =
    others > 0
      ? i18n.translate('xpack.alertzero.sseView.summary.andMore', {
          defaultMessage: '{leader} and {count} more',
          values: { leader: leaderText, count: others },
        })
      : leaderText;

  return summary.slice(0, MAX_SUMMARY_LENGTH);
};
