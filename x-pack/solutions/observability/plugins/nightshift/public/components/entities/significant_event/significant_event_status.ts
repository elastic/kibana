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
import type { SignificantEventInvestigationState } from '@kbn/significant-events-plugin/common';
import { getInvestigationProgressStatusLabel } from '../../../common/investigation_progress_status';

export { getInvestigationProgressStatusLabel };

/**
 * Nightshift surfaces two events buckets derived from `@kbn/significant-events-schema`
 * statuses:
 * - Needs action: `active` and `recovering` (still live until an operator deactivates it or its rule is deleted)
 * - Resolved: `inactive`
 *
 * The "Investigating" / "Investigated" badge is derived separately from
 * `event.investigations` (see `getInvestigationStatusLabel`).
 */
type StatusGroup = 'needsAction' | 'resolved';

const STATUS_GROUP: Record<SignificantEventStatus, StatusGroup> = {
  active: 'needsAction',
  recovering: 'needsAction',
  inactive: 'resolved',
};

export const NEEDS_ACTION_STATUSES: SignificantEventStatus[] =
  SIGNIFICANT_EVENT_STATUS_OPTIONS.filter((status) => STATUS_GROUP[status] === 'needsAction');
export const RESOLVED_STATUSES: SignificantEventStatus[] = SIGNIFICANT_EVENT_STATUS_OPTIONS.filter(
  (status) => STATUS_GROUP[status] === 'resolved'
);

export const SIGNIFICANT_EVENT_STATUS_LABELS: Record<SignificantEventStatus, string> = {
  active: i18n.translate('xpack.nightshift.significantEvent.status.active', {
    defaultMessage: 'Active',
  }),
  recovering: i18n.translate('xpack.nightshift.significantEvent.status.recovering', {
    defaultMessage: 'Recovering',
  }),
  inactive: i18n.translate('xpack.nightshift.significantEvent.status.inactive', {
    defaultMessage: 'Inactive',
  }),
};

/** Status marks for lists: live states stand out, inactive recedes. */
export const SIGNIFICANT_EVENT_STATUS_ICONS: Record<
  SignificantEventStatus,
  { iconType: string; color: 'primary' | 'subdued' }
> = {
  active: { iconType: 'checkCircle', color: 'primary' },
  recovering: { iconType: 'clock', color: 'subdued' },
  inactive: { iconType: 'crossCircle', color: 'subdued' },
};

export type StatusColor = 'danger' | 'success';

const getStatusGroup = (status: SignificantEventStatus): StatusGroup => STATUS_GROUP[status];

export const isNeedsActionStatus = (status: SignificantEventStatus): boolean =>
  getStatusGroup(status) === 'needsAction';

export const isResolvedStatus = (status: SignificantEventStatus): boolean =>
  getStatusGroup(status) === 'resolved';

export const getNeedsActionEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isNeedsActionStatus(status));

export const getResolvedEvents = (events: SignificantEvent[]): SignificantEvent[] =>
  events.filter(({ status }) => isResolvedStatus(status));

/**
 * Recency for list ordering. Prefer `updated_at` when the API provides it on the event doc.
 */
export const getEventUpdatedAt = (event: SignificantEvent): string => {
  const updatedAt = (event as SignificantEvent & { updated_at?: string }).updated_at;
  return updatedAt ?? event['@timestamp'];
};

const SEVERITY_RANK: Record<SignificantEvent['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Landing lists sort by criticality (`severity`) then recency (`updated_at`, falling back to `@timestamp`).
 */
export const byCriticalityAndUpdatedAtDesc = (
  first: SignificantEvent,
  second: SignificantEvent
): number =>
  (SEVERITY_RANK[second.severity] ?? -1) - (SEVERITY_RANK[first.severity] ?? -1) ||
  new Date(getEventUpdatedAt(second)).getTime() - new Date(getEventUpdatedAt(first)).getTime();

export const getStatusColor = (status: SignificantEventStatus): StatusColor =>
  isResolvedStatus(status) ? 'success' : 'danger';

type SignificantEventInvestigations = NonNullable<SignificantEvent['investigations']>;
export type SignificantEventInvestigation = SignificantEventInvestigations[number];

export const getLatestInvestigation = (
  event: Pick<SignificantEvent, 'investigations'>
): SignificantEventInvestigation | undefined => event.investigations?.at(-1);

export const isEventInvestigated = (event: Pick<SignificantEvent, 'investigations'>): boolean =>
  getLatestInvestigation(event)?.completed_at != null;
export const isInvestigationRunning = (
  event: Pick<SignificantEvent, 'investigations'>
): boolean => {
  const latestInvestigation = getLatestInvestigation(event);
  return latestInvestigation != null && latestInvestigation.completed_at == null;
};

export const hasRunningInvestigations = (events: SignificantEvent[]): boolean =>
  events.some(isInvestigationRunning);

export const getInvestigationStatusLabel = (
  event: Pick<SignificantEvent, 'investigations'>
): string => getInvestigationProgressStatusLabel(isEventInvestigated(event));

export const SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS: Record<
  SignificantEventInvestigationState,
  string
> = {
  not_started: i18n.translate('xpack.nightshift.significantEvent.investigationState.notStarted', {
    defaultMessage: 'Not started',
  }),
  in_progress: i18n.translate('xpack.nightshift.significantEvent.investigationState.inProgress', {
    defaultMessage: 'In progress',
  }),
  completed: i18n.translate('xpack.nightshift.significantEvent.investigationState.completed', {
    defaultMessage: 'Completed',
  }),
};
