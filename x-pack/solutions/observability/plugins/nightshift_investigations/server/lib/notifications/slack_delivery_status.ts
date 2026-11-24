/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationPhaseSchema } from './notification_routing';
import type {
  NotificationAttempt,
  NotificationPhase,
  NotificationRouting,
} from './notification_routing';
import { readSlackNotificationParams } from './slack_notification';

type DeliveryReason =
  | 'channel_not_connected'
  | 'app_disconnected'
  | 'rate_limited'
  | 'thread_unconfirmed';

const getDeliveryReason = (error: string | undefined): DeliveryReason | undefined => {
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

interface SlackDeliveryStatus {
  id: string;
  channel: string;
  phase?: NotificationPhase;
  status: 'sent' | 'failed' | 'unconfirmed';
  attemptedAt: string;
  reason?: DeliveryReason;
}

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
  return routing.destinations.flatMap(({ id, type, params }): SlackDeliveryStatus[] => {
    const attempt = latest.get(id);
    const channel = type === 'slack' && readSlackNotificationParams(params)?.channel;
    if (!channel || !attempt) return [];
    const { status, error, attempted_at: attemptedAt } = attempt;
    const phase = notificationPhaseSchema.safeParse(attempt.phase);
    return [
      {
        id,
        channel,
        phase: phase.success ? phase.data : undefined,
        status: status === 'sent' || status === 'failed' ? status : 'unconfirmed',
        attemptedAt,
        reason: status === 'sent' ? undefined : getDeliveryReason(error),
      },
    ];
  });
};
