/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/security-plugin-types-server';
import {
  AlertAuditAction,
  alertAuditEvent,
  workflowStatusAuditActionMap,
} from '@kbn/alerting-plugin/server/lib';

export type AuditAlertUpdateTarget = { ids: string[] } | { query: unknown };

interface UpdateByQueryResponse {
  failures?: unknown[];
  timed_out?: boolean;
  version_conflicts?: number;
}

const queryMessageSuffix = (query: unknown): string =>
  `. Bulk updating workflow status for alerts matching query: ${JSON.stringify(query)}`;

/**
 * Logs `alert_update` intent events (outcome `unknown`) before an Elasticsearch write.
 * One event per alert id, or one bulk event with the query in the message.
 */
export const auditAlertUpdateIntent = (
  auditLogger: AuditLogger | undefined,
  target: AuditAlertUpdateTarget
): void => {
  if ('ids' in target) {
    for (const id of target.ids) {
      auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE,
          id,
          outcome: 'unknown',
        })
      );
    }
    return;
  }

  const event = alertAuditEvent({
    action: AlertAuditAction.UPDATE,
    outcome: 'unknown',
    bulk: true,
  });
  auditLogger?.log({
    ...event,
    message: `${event.message}${queryMessageSuffix(target.query)}`,
  });
};

/**
 * Logs `alert_update` failure events with the error, then the caller rethrows.
 * One event per alert id, or one bulk event with the query in the message.
 */
export const auditAlertUpdateFailure = (
  auditLogger: AuditLogger | undefined,
  target: AuditAlertUpdateTarget,
  error: Error
): void => {
  if ('ids' in target) {
    for (const id of target.ids) {
      auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE,
          id,
          error,
        })
      );
    }
    return;
  }

  const event = alertAuditEvent({
    action: AlertAuditAction.UPDATE,
    error,
    bulk: true,
  });
  auditLogger?.log({
    ...event,
    message: `${event.message}${queryMessageSuffix(target.query)}`,
  });
};

/** Logs a failed update when Elasticsearch returns partial failures without throwing. */
export const auditAlertUpdateResponseFailure = (
  auditLogger: AuditLogger | undefined,
  target: AuditAlertUpdateTarget,
  response: UpdateByQueryResponse
): boolean => {
  const failures = response.failures ?? [];
  const versionConflicts = response.version_conflicts ?? 0;
  const timedOut = response.timed_out ?? false;
  if (failures.length === 0 && versionConflicts === 0 && !timedOut) {
    return false;
  }

  const details = [
    failures.length > 0 ? `${failures.length} document failure(s)` : undefined,
    versionConflicts > 0 ? `${versionConflicts} version conflict(s)` : undefined,
    timedOut ? 'request timed out' : undefined,
  ]
    .filter((detail): detail is string => detail !== undefined)
    .join(', ');
  const error = new Error(`Alert update had ${details}`);
  const event = alertAuditEvent({ action: AlertAuditAction.UPDATE, error, bulk: true });
  auditLogger?.log({
    ...event,
    message:
      'query' in target ? `${event.message}${queryMessageSuffix(target.query)}` : event.message,
  });
  return true;
};

/**
 * Logs a validation, precondition, or lookup failure that happens before the shared update operation runs.
 * A string becomes the error message; an `Error` is logged as-is.
 */
export const auditAlertUpdatePreOperationFailure = (
  auditLogger: AuditLogger | undefined,
  messageOrError: string | Error
): void => {
  const error = typeof messageOrError === 'string' ? new Error(messageOrError) : messageOrError;
  const event = alertAuditEvent({ action: AlertAuditAction.UPDATE, error, bulk: true });
  auditLogger?.log(event);
};

/** Logs an alert update denied by route authorization before its handler runs. */
export const auditAlertUpdateAuthorizationFailure = (
  auditLogger: AuditLogger | undefined
): void => {
  const event = alertAuditEvent({
    action: AlertAuditAction.UPDATE,
    error: new Error('Required privileges were not granted'),
    bulk: true,
  });
  auditLogger?.log({
    ...event,
    message: 'Failed attempt to update alerts because required privileges were not granted',
  });
};

/**
 * Logs `alert_acknowledge` / `alert_unacknowledge` after a successful workflow status write.
 * No-op for statuses that are not `acknowledged` or `open`.
 */
export const auditAlertWorkflowStatusChange = (
  auditLogger: AuditLogger | undefined,
  status: string,
  updated: number | undefined
): void => {
  const action = workflowStatusAuditActionMap[status];
  if (!action || (updated ?? 0) <= 0) {
    return;
  }

  auditLogger?.log(alertAuditEvent({ action, bulk: true }));
};
