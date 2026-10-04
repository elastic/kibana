/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { setEpisodeTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_episode_tags_step/set_episode_tags_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

const BULK_ACTION_PATH = `${ALERTING_V2_ALERT_API_PATH}/_bulk_action`;

// The v2 `tag` action is series-scoped (keyed on `group_hash`) and replaces the tag set.
export const setEpisodeTagsStepDefinition = createServerStepDefinition({
  ...setEpisodeTagsStepCommonDefinition,
  handler: async (context) => {
    const { group_hash: groupHash, tags } = context.input;

    try {
      await context.contextManager.callKibanaApi<{
        affected_count?: number;
        errors?: unknown[];
      }>({
        method: 'POST',
        path: BULK_ACTION_PATH,
        body: [
          {
            group_hash: groupHash,
            action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
            tags,
          },
        ],
      });

      return {
        output: { success: true, message: `Successfully set ${tags.length} tag(s) on the episode` },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'set episode tags');
    }
  },
});
