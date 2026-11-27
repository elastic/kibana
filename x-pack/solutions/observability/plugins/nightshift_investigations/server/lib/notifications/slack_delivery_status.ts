/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MISSING_NOTIFICATION_THREAD, notificationPhaseSchema } from './notification_routing';
import type {
  NotificationAttempt,
  NotificationPhase,
  NotificationRouting,
} from './notification_routing';
import { readSlackNotificationParams } from './slack_notification';

const SENDING_WINDOW_MS = 30_000;

export interface SlackDeliveryStatus {
  id: string;
  channel: string;
  phase?: NotificationPhase;
  status: 'sent' | 'failed' | 'sending' | 'unconfirmed';
  attemptedAt: string;
  message?: string;
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

const getAttemptMessage = (
  attempt: NotificationAttempt,
  attempts: NotificationAttempt[]
): string | undefined => {
  if (attempt.status !== 'failed') return;
  if (attempt.error !== MISSING_NOTIFICATION_THREAD) return attempt.error || undefined;

  const start = attempts.find(
    (entry) =>
      entry.execution_id === attempt.execution_id &&
      entry.destination_id === attempt.destination_id &&
      entry.phase === 'started' &&
      entry.status === 'failed'
  );
  return start?.error || MISSING_NOTIFICATION_THREAD;
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

/** Selects one receipt per Slack destination and projects its delivery status. */
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
        message: getAttemptMessage(attempt, routing.attempts),
      },
    ];
  });
};
