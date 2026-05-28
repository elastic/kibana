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
import type { SetAlertAssigneesBody } from '../../../../common/api/detection_engine/model/set_alert_assignees_body.gen';
import { assignAlertStepCommonDefinition } from '../../../../common/workflows/step_types/assign_alert_step/assign_alert_step_common';
import { setAlertAssigneesHandler } from '../../../lib/detection_engine/routes/common/set_alert_assignees_handler';
import { createFakeRequest, createFakeSecuritySolutionContext } from '../utils';

export const getAssignAlertStepDefinition = (
  core: CoreSetup,
  ruleDataClient: IRuleDataClient | null
) =>
  createServerStepDefinition({
    ...assignAlertStepCommonDefinition,
    handler: async (context) => {
      try {
        const fakeContext = await createFakeSecuritySolutionContext(core, context);
        const request = createFakeRequest<SetAlertAssigneesBody>(context, {
          ids: context.input.alert_ids,
          assignees: context.input.assignees,
        });

        const getIndexPattern = async () => {
          const spaceId = (await fakeContext.securitySolution).getSpaceId();
          const alertsIndex =
            ruleDataClient?.indexNameWithNamespace(spaceId) ?? `.alerts-security.alerts-${spaceId}`;
          return [alertsIndex];
        };

        const response = await setAlertAssigneesHandler({
          context: fakeContext,
          request,
          response: kibanaResponseFactory,
          getIndexPattern,
        });

        if (response.status !== 200) {
          throw new Error(response.payload?.message || 'Failed to assign alert');
        }

        return { output: { success: true } };
      } catch (error) {
        context.logger.error(
          'Failed to assign alert',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error('Failed to assign alert'),
        };
      }
    },
  });
