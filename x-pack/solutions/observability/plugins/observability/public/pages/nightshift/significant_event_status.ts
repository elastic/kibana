/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';

/**
 * Nightshift surfaces exactly two triage states, both derived from the statuses
 * defined in `@kbn/significant-events-schema`:
 * - "Investigating" (needs action): `promoted` (actionable) and `acknowledged` (known/tracked)
 * - "Investigated" (resolved): `resolved` and `closed` (closed incidents)
 *
 * `demoted` (false positive) is intentionally excluded — it is noise, not a
 * triage state, so it never appears in the counts, lists, or blast radius.
 *
 * These are the single source of truth for grouping so the summary cards, the
 * event lists, and the per-event status badge cannot drift apart.
 */
export const NEEDS_ACTION_STATUSES = ['promoted', 'acknowledged'] as const;
export const RESOLVED_STATUSES = ['resolved', 'closed'] as const;

const needsActionStatusSet: ReadonlySet<SignificantEventStatus> = new Set(NEEDS_ACTION_STATUSES);
const resolvedStatusSet: ReadonlySet<SignificantEventStatus> = new Set(RESOLVED_STATUSES);

export type StatusColor = 'danger' | 'success';

export const isNeedsActionStatus = (status: SignificantEventStatus): boolean =>
  needsActionStatusSet.has(status);

export const isResolvedStatus = (status: SignificantEventStatus): boolean =>
  resolvedStatusSet.has(status);

export const getNeedsActionEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isNeedsActionStatus(status));

export const getResolvedEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isResolvedStatus(status));

/** Keeps only the events that reference the given stream, or all events when no stream is selected. */
export const filterEventsByStream = (
  events: SignificantEvent[],
  streamName: string | undefined
): SignificantEvent[] =>
  streamName
    ? events.filter(({ stream_names: streamNames }) => (streamNames ?? []).includes(streamName))
    : events;

/** Highest user-experience impact (SEV1) first; see the `criticality` field docs in the schema. */
export const byCriticalityDesc = (first: SignificantEvent, second: SignificantEvent): number =>
  second.criticality - first.criticality;

export const getStatusColor = (status: SignificantEventStatus): StatusColor =>
  isResolvedStatus(status) ? 'success' : 'danger';

export const getStatusLabel = (status: SignificantEventStatus): string =>
  isResolvedStatus(status)
    ? i18n.translate('xpack.observability.nightshift.event.investigatedStatusLabel', {
        defaultMessage: 'Investigated',
      })
    : i18n.translate('xpack.observability.nightshift.event.investigatingStatusLabel', {
        defaultMessage: 'Investigating',
      });
