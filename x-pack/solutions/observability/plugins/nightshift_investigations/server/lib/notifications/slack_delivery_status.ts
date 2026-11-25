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

type DeliveryReason =
  | SlackDeliveryFailureReason
  | 'start_rate_limited'
  | 'thread_missing'
  | 'thread_unconfirmed';

const getRecordedDeliveryReason = (attempt?: NotificationAttempt): DeliveryReason | undefined => {
  const reason = attempt?.reason_code;
  if (isSlackDeliveryFailureReason(reason)) return reason;
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
  reason?: DeliveryReason;
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

const getAttemptReason = (
  attempt: NotificationAttempt,
  attempts: NotificationAttempt[]
): DeliveryReason | undefined => {
  if (attempt.status === 'sent') return;
  const recordedReason = getRecordedDeliveryReason(attempt);
  if (recordedReason) return recordedReason;
  if (attempt.status === 'failed' && attempt.error === MISSING_NOTIFICATION_THREAD) {
    const started = attempts.find(
      (entry) =>
        entry.execution_id === attempt.execution_id &&
        entry.destination_id === attempt.destination_id &&
        entry.phase === 'started' &&
        entry.status === 'failed'
    );
    const reason = getRecordedDeliveryReason(started);
    if (reason === 'channel_not_connected' || reason === 'app_disconnected') return reason;
    return reason === 'rate_limited' ? 'start_rate_limited' : 'thread_missing';
  }
};

/** Projects recorded Slack outcomes without exposing connector diagnostics. */
export const getSlackDeliveryStatus = (
  routing: NotificationRouting,
  executionIds?: ReadonlySet<string>
): SlackDeliveryStatus[] => {
  const latest = new Map<string, NotificationAttempt>();
  for (const attempt of routing.attempts) {
    if (executionIds && !executionIds.has(attempt.execution_id)) continue;
    const previous = latest.get(attempt.destination_id);
    if (previous && executionIds && previous.phase !== attempt.phase) {
      if (attempt.phase === 'started') continue;
      if (previous.phase === 'started') {
        latest.set(attempt.destination_id, attempt);
        continue;
      }
    }
    if (!previous || attempt.attempted_at >= previous.attempted_at) {
      latest.set(attempt.destination_id, attempt);
    }
  }
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
        reason: getAttemptReason(attempt, routing.attempts),
      },
    ];
  });
};
