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
import { setAttackTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_tags_step/set_attack_tags_step_common';
import { setAlertTagsHandler } from '../../../lib/detection_engine/routes/common/set_alert_tags_handler';
import {
  createFakeRequest,
  createFakeSecuritySolutionContext,
  resolveAttackTargetsAndIndices,
} from '../utils';

export const getSetAttackTagsStepDefinition = (
  core: CoreSetup,
  ruleDataClient: IRuleDataClient | null
) =>
  createServerStepDefinition({
    ...setAttackTagsStepCommonDefinition,
    handler: async (context) => {
      try {
        const fakeContext = await createFakeSecuritySolutionContext(core, context);

        const { targetIds, getIndexPattern } = await resolveAttackTargetsAndIndices(
          context,
          fakeContext,
          ruleDataClient,
          context.input
        );

        const request = createFakeRequest<SetAlertTagsBody>(context, {
          ids: targetIds,
          tags: context.input.tags,
        });

        const response = await setAlertTagsHandler({
          context: fakeContext,
          request,
          response: kibanaResponseFactory,
          getIndexPattern,
        });

        if (response.status !== 200) {
          throw new Error(response.payload?.message || 'Failed to set attack tags');
        }

        return { output: { success: true } };
      } catch (error) {
        context.logger.error(
          'Failed to set attack tags',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error('Failed to set attack tags'),
        };
      }
    },
  });
