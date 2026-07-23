/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type SignificantEvent,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';

/**
 * Nightshift surfaces exactly two triage states, both derived from the statuses
 * defined in `@kbn/significant-events-schema`:
 * - "Investigating" (needs action): `open` (actionable)
 * - "Investigated" (resolved): `closed` (resolved incidents) and `dismissed`
 *   (false positives), which no longer need attention.
 *
 * The `STATUS_GROUP` map below is the single source of truth for this grouping so
 * the summary cards, the event lists, and the per-event status badge cannot drift
 * apart. Because it is a `Record<SignificantEventStatus, StatusGroup>`, adding a
 * status to the schema without classifying it here is a compile-time error, so a
 * new status can never silently vanish from the page.
 */
type StatusGroup = 'needsAction' | 'resolved';

const STATUS_GROUP: Record<SignificantEventStatus, StatusGroup> = {
  open: 'needsAction',
  closed: 'resolved',
  dismissed: 'resolved',
};

export const NEEDS_ACTION_STATUSES: SignificantEventStatus[] =
  SIGNIFICANT_EVENT_STATUS_OPTIONS.filter((status) => STATUS_GROUP[status] === 'needsAction');
export const RESOLVED_STATUSES: SignificantEventStatus[] = SIGNIFICANT_EVENT_STATUS_OPTIONS.filter(
  (status) => STATUS_GROUP[status] === 'resolved'
);

export type StatusColor = 'danger' | 'success';

export const isNeedsActionStatus = (status: SignificantEventStatus): boolean =>
  STATUS_GROUP[status] === 'needsAction';

export const isResolvedStatus = (status: SignificantEventStatus): boolean =>
  STATUS_GROUP[status] === 'resolved';

export const getNeedsActionEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isNeedsActionStatus(status));

export const getResolvedEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isResolvedStatus(status));

export const filterEventsByStream = (
  events: SignificantEvent[],
  streamName: string | undefined
): SignificantEvent[] =>
  streamName
    ? events.filter(({ stream_names: streamNames }) => (streamNames ?? []).includes(streamName))
    : events;

/**
 * Highest-severity events first; see the `severity` field docs in the schema.
 * Ties break on recency (`@timestamp`) so equal-severity rows keep a stable order
 * between loads instead of shuffling.
 */
export const bySeverityDesc = (first: SignificantEvent, second: SignificantEvent): number =>
  second.severity.localeCompare(first.severity) ||
  new Date(second['@timestamp']).getTime() - new Date(first['@timestamp']).getTime();

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
