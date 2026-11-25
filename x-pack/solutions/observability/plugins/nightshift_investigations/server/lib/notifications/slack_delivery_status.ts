/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSlackDeliveryFailureReason } from '@kbn/connector-specs';
import type { SlackDeliveryFailureReason } from '@kbn/connector-specs';
import { MISSING_NOTIFICATION_THREAD, notificationPhaseSchema } from './notification_routing';
import type {
  NotificationAttempt,
  NotificationPhase,
  NotificationRouting,
} from './notification_routing';
import { readSlackNotificationParams } from './slack_notification';

const SENDING_WINDOW_MS = 30_000;

type DeliveryFailureReason =
  | SlackDeliveryFailureReason
  | 'start_rate_limited'
  | 'thread_missing'
  | 'thread_unconfirmed';

const getRecordedDeliveryFailureReason = (
  attempt?: NotificationAttempt
): DeliveryFailureReason | undefined => {
  const failureReason = attempt?.failure_reason_code;
  if (isSlackDeliveryFailureReason(failureReason)) return failureReason;
  const error = attempt?.error;
  if (!error) return;
  if (error.includes('is not connected. Connect it in the Elastic Slack app settings.')) {
    return 'channel_not_connected';
  }
  if (error.includes('The Elastic Slack app is no longer installed in this workspace')) {
    return 'app_disconnected';
  }
  if (/Slack rate-limited this request|\bratelimited\b/i.test(error)) {
    return 'rate_limited';
  }
  if (error.includes('A previous root delivery is unconfirmed')) {
    return 'thread_unconfirmed';
  }
};

export interface SlackDeliveryStatus {
  id: string;
  channel: string;
  phase?: NotificationPhase;
  status: 'sent' | 'failed' | 'sending' | 'unconfirmed';
  attemptedAt: string;
  reason?: DeliveryFailureReason;
}

const getAttemptStatus = (
  { status, error, attempted_at: attemptedAt }: NotificationAttempt,
  now: number
): SlackDeliveryStatus['status'] => {
  if (status === 'sent' || status === 'failed') return status;
  // A claim is stored before sending. Give it a bounded window to gain an outcome.
  const age = now - Date.parse(attemptedAt);
  if (status === 'unconfirmed' && error === undefined && age >= 0 && age < SENDING_WINDOW_MS) {
    return 'sending';
  }
  return 'unconfirmed';
};

const getAttemptFailureReason = (
  attempt: NotificationAttempt,
  attempts: NotificationAttempt[]
): DeliveryFailureReason | undefined => {
  if (attempt.status === 'sent') return;
  const recordedFailureReason = getRecordedDeliveryFailureReason(attempt);
  if (recordedFailureReason) return recordedFailureReason;
  if (attempt.status === 'failed' && attempt.error === MISSING_NOTIFICATION_THREAD) {
    const started = attempts.find(
      (entry) =>
        entry.execution_id === attempt.execution_id &&
        entry.destination_id === attempt.destination_id &&
        entry.phase === 'started' &&
        entry.status === 'failed'
    );
    const startFailureReason = getRecordedDeliveryFailureReason(started);
    if (
      startFailureReason === 'channel_not_connected' ||
      startFailureReason === 'app_disconnected'
    ) {
      return startFailureReason;
    }
    return startFailureReason === 'rate_limited' ? 'start_rate_limited' : 'thread_missing';
  }
};

const isPreferredAttempt = (
  attempt: NotificationAttempt,
  previous: NotificationAttempt,
  isRunSelected: boolean
): boolean => {
  if (isRunSelected) {
    // The selected run shows the findings outcome even if a start receipt was recorded later.
    const isStart = attempt.phase === 'started';
    const previousWasStart = previous.phase === 'started';
    if (isStart !== previousWasStart) return previousWasStart;
  }
  return attempt.attempted_at >= previous.attempted_at;
};

const selectAttemptsByDestination = (
  attempts: NotificationAttempt[],
  executionIds?: ReadonlySet<string>
): Map<string, NotificationAttempt> => {
  const latest = new Map<string, NotificationAttempt>();
  const isRunSelected = executionIds !== undefined;
  for (const attempt of attempts) {
    if (executionIds && !executionIds.has(attempt.execution_id)) continue;
    const previous = latest.get(attempt.destination_id);
    if (!previous || isPreferredAttempt(attempt, previous, isRunSelected)) {
      latest.set(attempt.destination_id, attempt);
    }
  }
  return latest;
};

/** Selects one receipt per Slack destination and projects its status without connector diagnostics. */
export const getSlackDeliveryStatus = (
  routing: NotificationRouting,
  executionIds?: ReadonlySet<string>
): SlackDeliveryStatus[] => {
  const latest = selectAttemptsByDestination(routing.attempts, executionIds);
  const now = Date.now();
  return routing.destinations.flatMap(({ id, type, params }): SlackDeliveryStatus[] => {
    const attempt = latest.get(id);
    const channel = type === 'slack' && readSlackNotificationParams(params)?.channel;
    if (!channel || !attempt) return [];
    const phase = notificationPhaseSchema.safeParse(attempt.phase);
    return [
      {
        id,
        channel,
        phase: phase.success ? phase.data : undefined,
        status: getAttemptStatus(attempt, now),
        attemptedAt: attempt.attempted_at,
        reason: getAttemptFailureReason(attempt, routing.attempts),
      },
    ];
  });
};
