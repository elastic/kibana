/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Coarse activity categories we derive from ECS `event.category` on the raw
 * `logs-*` events that connect two entities. Each maps to a distinct human
 * phrase so an analyst reading the graph knows *what happened* between nodes,
 * not just that they share an alert.
 */
export type ActivityKind = 'network' | 'authentication' | 'process' | 'file';

export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  'network',
  'authentication',
  'process',
  'file',
];

/**
 * A single summarized activity between the focus entity and a neighbor,
 * derived from a bounded aggregation over `logs-*` events. `count` is the
 * number of contributing events; `detail` is the dominant concrete target
 * (dest ip:port, process name, file path, host) used to build the phrase.
 */
export interface ActivitySummary {
  kind: ActivityKind;
  /** Number of contributing raw events. */
  count: number;
  /** Dominant concrete target, e.g. `10.20.10.11:445`, `powershell.exe`. */
  detail: string | undefined;
  /** Earliest observed event time (ISO), if available. */
  firstSeen: string | undefined;
  /** Latest observed event time (ISO), if available. */
  lastSeen: string | undefined;
}

/**
 * Full event context attached to a relationship edge / neighbor node. Holds
 * every activity breakdown plus the single dominant activity used for the
 * on-edge label. When no `logs-*` events matched, `activities` is empty and the
 * view falls back to the shared-alert summary.
 */
export interface EdgeContext {
  /** All activity summaries, ordered by descending event count. */
  activities: readonly ActivitySummary[];
  /** Total contributing events across all activities. */
  totalEvents: number;
  /** The dominant activity (highest count), if any. */
  dominant: ActivitySummary | undefined;
}

export const EMPTY_EDGE_CONTEXT: EdgeContext = {
  activities: [],
  totalEvents: 0,
  dominant: undefined,
};

/** Raw bucket shape shared by the term aggregations we run against `logs-*`. */
export interface EventContextBucket {
  key: string;
  doc_count: number;
  earliest?: { value_as_string?: string };
  latest?: { value_as_string?: string };
}

/**
 * The aggregation payload we read for one focus↔neighbor pair. Each optional
 * branch corresponds to an ECS `event.category`; every branch is bounded by a
 * small `size` upstream. All branches are optional so an index missing a given
 * category (or `logs-*` missing entirely) degrades gracefully to fallback.
 */
export interface EventContextAggregations {
  network_targets?: { buckets: EventContextBucket[] };
  auth_targets?: { buckets: EventContextBucket[] };
  process_targets?: { buckets: EventContextBucket[] };
  file_targets?: { buckets: EventContextBucket[] };
}

const firstBucket = (
  agg: { buckets: EventContextBucket[] } | undefined
): { detail: string | undefined; count: number; firstSeen?: string; lastSeen?: string } => {
  const buckets = agg?.buckets ?? [];
  const total = buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);
  const top = buckets[0];
  return {
    detail: top?.key,
    count: total,
    firstSeen: top?.earliest?.value_as_string,
    lastSeen: top?.latest?.value_as_string,
  };
};

/**
 * Pure reducer: folds a bounded `logs-*` aggregation payload into an
 * {@link EdgeContext}. Categories with zero events are dropped. The result is
 * ordered by descending event count so the dominant activity leads the edge
 * label and the evidence drawer.
 */
export const toEdgeContext = (aggregations: EventContextAggregations | undefined): EdgeContext => {
  if (!aggregations) return EMPTY_EDGE_CONTEXT;

  const candidates: Array<{ kind: ActivityKind; agg?: { buckets: EventContextBucket[] } }> = [
    { kind: 'network', agg: aggregations.network_targets },
    { kind: 'authentication', agg: aggregations.auth_targets },
    { kind: 'process', agg: aggregations.process_targets },
    { kind: 'file', agg: aggregations.file_targets },
  ];

  const activities: ActivitySummary[] = [];
  for (const { kind, agg } of candidates) {
    const { detail, count, firstSeen, lastSeen } = firstBucket(agg);
    if (count > 0) {
      activities.push({ kind, count, detail, firstSeen, lastSeen });
    }
  }

  activities.sort((left, right) => right.count - left.count);
  const totalEvents = activities.reduce((sum, activity) => sum + activity.count, 0);
  return { activities, totalEvents, dominant: activities[0] };
};

/**
 * Builds a short, human relationship phrase for a single activity, driven by
 * real event data. Falls back to a generic verb when the concrete detail is
 * missing. All strings are i18n'd under the explorer namespace.
 */
export const activityPhrase = (activity: ActivitySummary): string => {
  const { kind, count, detail } = activity;
  switch (kind) {
    case 'network':
      return detail
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextNetworkTo',
            {
              defaultMessage:
                'connected to {detail} ({count, plural, one {# flow} other {# flows}})',
              values: { detail, count },
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextNetwork',
            {
              defaultMessage: 'network activity ({count, plural, one {# flow} other {# flows}})',
              values: { count },
            }
          );
    case 'authentication':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextAuth',
        {
          defaultMessage: 'authenticated to ({count, plural, one {# logon} other {# logons}})',
          values: { count },
        }
      );
    case 'process':
      return detail
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextProcessNamed',
            {
              defaultMessage:
                'spawned process {detail} ({count, plural, one {# event} other {# events}})',
              values: { detail, count },
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextProcess',
            {
              defaultMessage: 'process activity ({count, plural, one {# event} other {# events}})',
              values: { count },
            }
          );
    case 'file':
      return detail
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextFileNamed',
            {
              defaultMessage:
                'touched file {detail} ({count, plural, one {# event} other {# events}})',
              values: { detail, count },
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextFile',
            {
              defaultMessage: 'file activity ({count, plural, one {# event} other {# events}})',
              values: { count },
            }
          );
  }
};

/** Localized label for an activity category (used in the evidence drawer). */
export const activityKindLabel = (kind: ActivityKind): string => {
  switch (kind) {
    case 'network':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextKindNetwork',
        { defaultMessage: 'Network' }
      );
    case 'authentication':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextKindAuth',
        { defaultMessage: 'Authentication' }
      );
    case 'process':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextKindProcess',
        { defaultMessage: 'Process' }
      );
    case 'file':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextKindFile',
        { defaultMessage: 'File' }
      );
  }
};

/**
 * Produces the phrase shown on / near an edge. Prefers the dominant real
 * activity; when there is none (no matching `logs-*` events) it falls back to
 * the shared-alert summary so the edge is never blank.
 */
export const edgeContextSummary = (context: EdgeContext, fallbackAlertCount: number): string => {
  if (context.dominant) {
    return activityPhrase(context.dominant);
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextFallbackAlerts',
    {
      defaultMessage: '{count, plural, one {# shared alert} other {# shared alerts}}',
      values: { count: fallbackAlertCount },
    }
  );
};
