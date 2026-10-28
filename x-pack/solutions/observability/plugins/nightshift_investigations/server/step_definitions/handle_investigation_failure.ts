/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { INVESTIGATION_FAILED_TRIGGER_ID } from '../../common/workflows/triggers';
import type { GetTriggerEmitter } from '../types';
import { sendInvestigationNotifications } from '../lib/notifications/send_investigation_notifications';
import type { InvestigationNotificationDeps } from '../lib/notifications/send_investigation_notifications';

const inputSchema = lazySchema(() =>
  z.object({
    investigation_id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    reason: z.string().max(MAX_TEXT_LENGTH),
  })
);

export const handleInvestigationFailureStepDefinition = (
  deps: InvestigationNotificationDeps & { getTriggerEmitter: GetTriggerEmitter }
) =>
  createServerStepDefinition({
    id: 'nightshift.handleInvestigationFailure',
    label: 'Handle Nightshift Investigation Failure',
    category: StepCategory.Ai,
    description:
      'Records an investigation run and reports its failure through lifecycle notifications.',
    inputSchema,
    outputSchema: z.object({ sent: z.number(), failed: z.number(), unconfirmed: z.number() }),
    handler: async (context) => {
      if (context.abortSignal.aborted) {
        return { output: { sent: 0, failed: 0, unconfirmed: 0 } };
      }
      const { investigation_id: investigationId, reason } = inputSchema.parse(context.input);
      const request = context.contextManager.getFakeRequest();
      const {
        execution: { id: executionId },
        workflow: { spaceId },
      } = context.contextManager.getContext();
      const client = deps.getInvestigationsClient(request, spaceId);
      await client.ensureForFailure(investigationId, executionId, reason);
      const output = await sendInvestigationNotifications(deps, context, {
        investigationId,
        phase: 'failed',
        reason,
        onTerminalPhaseSelected: async () => {
          try {
            const emitter = deps.getTriggerEmitter(request);
            if (!emitter) {
              return;
            }
            const lifecycleSubject = await client.getLifecycleSubject(investigationId);
            if (lifecycleSubject) {
              emitter(INVESTIGATION_FAILED_TRIGGER_ID, {
                investigation_id: investigationId,
                subject: lifecycleSubject.subject,
                trigger_type: lifecycleSubject.triggerType,
                started_at: lifecycleSubject.startedAt,
                status: 'failed',
                completed_at: new Date().toISOString(),
              });
            }
          } catch (error) {
            context.logger.warn(`Could not emit investigation failure: ${error.message}`);
          }
        },
      });
      return { output };
    },
  });
