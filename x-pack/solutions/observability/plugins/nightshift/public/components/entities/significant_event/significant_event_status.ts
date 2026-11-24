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
import type { EventInvestigationState } from '../../../data/significant_events/investigation_state';

/**
 * Nightshift surfaces two events buckets derived from `@kbn/significant-events-schema`
 * statuses:
 * - Needs action: `active` and `recovering` (still live until an operator deactivates it or its rule is deleted)
 * - Resolved: `inactive`
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

export const SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS: Record<EventInvestigationState, string> =
  {
    not_started: i18n.translate('xpack.nightshift.significantEvent.investigationState.notStarted', {
      defaultMessage: 'Not started',
    }),
    in_progress: i18n.translate('xpack.nightshift.significantEvent.investigationState.inProgress', {
      defaultMessage: 'In progress',
    }),
    completed: i18n.translate('xpack.nightshift.significantEvent.investigationState.completed', {
      defaultMessage: 'Completed',
    }),
    unknown: i18n.translate('xpack.nightshift.significantEvent.investigationState.unknown', {
      defaultMessage: 'Unknown',
    }),
  };

export const SIGNIFICANT_EVENT_INVESTIGATION_STATE_UNKNOWN_TOOLTIP = i18n.translate(
  'xpack.nightshift.significantEvent.investigationState.unknownTooltip',
  { defaultMessage: 'Investigation status unavailable' }
);
