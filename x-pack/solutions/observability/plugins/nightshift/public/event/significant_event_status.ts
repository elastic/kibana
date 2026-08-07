/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type SignificantEvent,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { getInvestigationProgressStatusLabel } from '../common/investigation_progress_status';

export { getInvestigationProgressStatusLabel };

/**
 * Nightshift surfaces two events buckets derived from `@kbn/significant-events-schema`
 * statuses:
 * - Needs action: `open`
 * - Resolved: `closed` and `dismissed`
 *
 * The "Investigating" / "Investigated" badge is derived separately from
 * `event.investigations` (see `getInvestigationStatusLabel`).
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

const parseSeverityRank = (severity: string | undefined): number => {
  if (!severity) {
    return -1;
  }
  const match = /^(\d+)/.exec(severity);
  return match ? Number.parseInt(match[1], 10) : 0;
};

/**
 * Landing lists sort by criticality (`severity`) then recency (`updated_at`, falling back to `@timestamp`).
 */
export const byCriticalityAndUpdatedAtDesc = (
  first: SignificantEvent,
  second: SignificantEvent
): number =>
  parseSeverityRank(second.severity) - parseSeverityRank(first.severity) ||
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

const rememberedInvestigationTerminalFailures = new Map<string, 'failed' | 'unavailable'>();

export const rememberInvestigationTerminalFailure = (
  workflowExecutionId: string,
  status: 'failed' | 'unavailable'
): void => {
  rememberedInvestigationTerminalFailures.set(workflowExecutionId, status);
};

export const getRememberedInvestigationTerminalFailure = (
  workflowExecutionId: string
): 'failed' | 'unavailable' | undefined =>
  rememberedInvestigationTerminalFailures.get(workflowExecutionId);

export const clearRememberedInvestigationTerminalFailuresForTests = (): void => {
  rememberedInvestigationTerminalFailures.clear();
};

export const isInvestigationRunning = (
  event: Pick<SignificantEvent, 'investigations'>
): boolean => {
  const latestInvestigation = getLatestInvestigation(event);
  if (latestInvestigation == null || latestInvestigation.completed_at != null) {
    return false;
  }
  return !rememberedInvestigationTerminalFailures.has(latestInvestigation.workflow_execution_id);
};

export const hasRunningInvestigations = (events: SignificantEvent[]): boolean =>
  events.some(isInvestigationRunning);

export const getInvestigationStatusLabel = (
  event: Pick<SignificantEvent, 'investigations'>
): string => getInvestigationProgressStatusLabel(isEventInvestigated(event));
