/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  trackAlertOutcomeStepCommonDefinition,
  trackAlertOutcomeStepInputSchema,
} from '../../common/workflows/steps/track_alert_outcome';
import type { AlertOutcomeServices } from '../alert_outcomes/deps';
import { trackInvestigationAlertOutcome } from '../alert_outcomes/track_investigation';

/**
 * Runs after a successful first round of an investigation that has no alert on this cluster as a
 * subject. Never fails the investigation: every problem becomes a skip reason.
 */
export const trackAlertOutcomeStepDefinition = (getServices: () => AlertOutcomeServices) =>
  createServerStepDefinition({
    ...trackAlertOutcomeStepCommonDefinition,
    handler: async (context) => {
      const { workflow, execution } = context.contextManager.getContext();
      if (execution.isTestRun) return { output: { skip_reason: 'disabled' as const } };
      try {
        const input = trackAlertOutcomeStepInputSchema.parse(context.input);
        const isFollowUp = input.is_follow_up === true || Boolean(input.follow_up);
        if (isFollowUp) return { output: { skip_reason: 'follow_up' as const } };
        const deps = await getServices().getTrackDeps(context.contextManager.getFakeRequest(), {
          investigationId: input.investigation_id,
          roundConnectorId: input.connector_id || undefined,
        });
        const output = await trackInvestigationAlertOutcome(deps, {
          spaceId: workflow.spaceId,
          investigationId: input.investigation_id,
          automationId: input.automation_id || undefined,
          isFollowUp,
          investigationStartedAt: input.investigation_started_at,
          abortSignal: context.abortSignal,
        });
        return { output };
      } catch (error) {
        context.logger.warn(
          `Could not track the alert outcome: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { output: { skip_reason: 'failed' as const } };
      }
    },
  });
