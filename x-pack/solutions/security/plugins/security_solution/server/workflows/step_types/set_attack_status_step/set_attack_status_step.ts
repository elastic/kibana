/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { SetAlertsStatusRequestBody } from '../../../../common/api/detection_engine/signals';
import { setAttackStatusStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';
import { setWorkflowStatusHandler } from '../../../lib/detection_engine/routes/common/set_workflow_status_handler';
import {
  createFakeRequest,
  createFakeSecuritySolutionContext,
  resolveAttackTargetsAndIndices,
} from '../utils';

export const getSetAttackStatusStepDefinition = (
  core: CoreSetup,
  ruleDataClient: IRuleDataClient | null
) =>
  createServerStepDefinition({
    ...setAttackStatusStepCommonDefinition,
    handler: async (context) => {
      try {
        const fakeContext = await createFakeSecuritySolutionContext(core, context);

        const { targetIds, getIndexPattern } = await resolveAttackTargetsAndIndices(
          context,
          fakeContext,
          ruleDataClient,
          context.input
        );

        const body: SetAlertsStatusRequestBody =
          context.input.status === 'closed'
            ? {
                signal_ids: targetIds,
                status: 'closed',
                reason: context.input.reason,
              }
            : {
                signal_ids: targetIds,
                status: context.input.status,
              };

        const request = createFakeRequest<SetAlertsStatusRequestBody>(context, body);

        const response = await setWorkflowStatusHandler({
          context: fakeContext,
          request,
          response: kibanaResponseFactory,
          getIndexPattern,
        });

        if (response.status !== 200) {
          throw new Error(response.payload?.message || 'Failed to set attack status');
        }

        return { output: { success: true } };
      } catch (error) {
        context.logger.error(
          'Failed to set attack status',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error('Failed to set attack status'),
        };
      }
    },
  });
