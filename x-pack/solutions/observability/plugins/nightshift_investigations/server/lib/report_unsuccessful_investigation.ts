/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExecutionStatus } from '@kbn/workflows';
import type { GetTriggerEmitter } from '../types';
import { INVESTIGATION_FAILED_TRIGGER_ID } from '../../common/workflows/triggers';
import {
  sendInvestigationNotificationsForExecution,
  type InvestigationNotificationDeps,
  type InvestigationNotificationSource,
} from './notifications/send_investigation_notifications';

/** Reconciles a persisted failed or timed-out run using its original context and destinations. */
export const reportUnsuccessfulInvestigation = async (
  deps: InvestigationNotificationDeps & { getTriggerEmitter: GetTriggerEmitter },
  source: InvestigationNotificationSource
): Promise<void> => {
  if (source.abortSignal.aborted) return;
  const client = deps.getInvestigationsClient(source.request, source.spaceId);
  const { execution, investigationId } = await client.getUnsuccessfulRun(source.executionId);
  const phase = execution.status === ExecutionStatus.TIMED_OUT ? 'timed_out' : 'failed';
  const reason = (
    execution.error?.message?.trim() ||
    (phase === 'timed_out'
      ? i18n.translate('xpack.nightshiftInvestigations.sweep.timeoutErrorMessage', {
          defaultMessage: 'Investigation exceeded its workflow timeout',
        })
      : i18n.translate('xpack.nightshiftInvestigations.sweep.failureErrorMessage', {
          defaultMessage: 'Investigation stopped unexpectedly',
        }))
  ).slice(0, 10_000);
  // A subject attachment failure must not prevent notification delivery; the event may already exist.
  try {
    await client.ensureForFailure(investigationId, execution.id, reason);
  } catch (error) {
    source.logger.warn(
      `Could not recover investigation ${investigationId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  let latestRun = false;
  try {
    latestRun = await client.isLatestInvestigationRun(execution);
  } catch (error) {
    source.logger.warn(
      `Could not determine the latest investigation run: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  await sendInvestigationNotificationsForExecution(deps, source, {
    investigationId,
    phase,
    reason,
    onTerminalPhaseSelected: latestRun
      ? async () => {
          try {
            const emitter = deps.getTriggerEmitter(source.request);
            const subject = await client.getLifecycleSubject(investigationId);
            if (!emitter || !subject) return;
            // Timeouts remain unsuccessful outcomes for existing failure-trigger subscribers.
            emitter(INVESTIGATION_FAILED_TRIGGER_ID, {
              investigation_id: investigationId,
              execution_id: execution.id,
              subject: subject.subject,
              trigger_type: subject.triggerType,
              started_at: execution.startedAt || subject.startedAt,
              status: 'failed',
              completed_at: execution.finishedAt || subject.startedAt,
            });
          } catch (error) {
            source.logger.warn(
              `Could not emit investigation failure: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      : undefined,
  });
};
