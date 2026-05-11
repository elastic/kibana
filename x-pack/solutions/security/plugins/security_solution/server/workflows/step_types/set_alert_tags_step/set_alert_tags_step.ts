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
import type { SetAlertTagsBody } from '../../../../common/api/detection_engine/model/set_alert_tags_body.gen';
import { setAlertTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_alert_tags_step/set_alert_tags_step_common';
import { setAlertTagsHandler } from '../../../lib/detection_engine/routes/common/set_alert_tags_handler';
import { createFakeRequest, createFakeSecuritySolutionContext } from '../utils';

export const getSetAlertTagsStepDefinition = (
  core: CoreSetup,
  ruleDataClient: IRuleDataClient | null
) =>
  createServerStepDefinition({
    ...setAlertTagsStepCommonDefinition,
    handler: async (context) => {
      try {
        const fakeContext = await createFakeSecuritySolutionContext(core, context);
        const request = createFakeRequest<SetAlertTagsBody>(context, {
          ids: context.input.alert_ids,
          tags: context.input.tags,
        });

        const getIndexPattern = async () => {
          const spaceId = (await fakeContext.securitySolution).getSpaceId();
          const alertsIndex =
            ruleDataClient?.indexNameWithNamespace(spaceId) ?? `.alerts-security.alerts-${spaceId}`;
          return [alertsIndex];
        };

        const response = await setAlertTagsHandler({
          context: fakeContext,
          request,
          response: kibanaResponseFactory,
          getIndexPattern,
        });

        if (response.status !== 200) {
          throw new Error(response.payload?.message || 'Failed to set alert tags');
        }

        return { output: { success: true } };
      } catch (error) {
        context.logger.error(
          'Failed to set alert tags',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error('Failed to set alert tags'),
        };
      }
    },
  });
