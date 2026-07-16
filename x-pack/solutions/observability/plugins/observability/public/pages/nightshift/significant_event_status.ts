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
 * Single source of truth for grouping the schema statuses into Nightshift's two
 * triage states, shared by the summary cards, event lists, and status badges.
 * The exhaustive `Record` makes classifying a newly added schema status a
 * compile-time requirement.
 */
type StatusGroup = 'needsAction' | 'resolved';

const STATUS_GROUP: Record<SignificantEventStatus, StatusGroup> = {
  promoted: 'needsAction',
  acknowledged: 'needsAction',
  resolved: 'resolved',
  closed: 'resolved',
  demoted: 'resolved',
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

// Highest impact first; ties break on recency for a stable order between loads.
export const byCriticalityDesc = (first: SignificantEvent, second: SignificantEvent): number =>
  second.criticality - first.criticality ||
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
