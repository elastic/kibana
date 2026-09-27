/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { assignEpisodeStepCommonDefinition } from '../../../../common/workflows/step_types/assign_episode_step/assign_episode_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

const BULK_ACTION_PATH = `${ALERTING_V2_ALERT_API_PATH}/_bulk_action`;

// The v2 `assign` action is episode-scoped and replaces the assignee (`assignee_uid: null` clears).
export const assignEpisodeStepDefinition = createServerStepDefinition({
  ...assignEpisodeStepCommonDefinition,
  handler: async (context) => {
    const { group_hash: groupHash, episode_id: episodeId, assignee_uid: assigneeUid } =
      context.input;

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
            action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
            episode_id: episodeId,
            assignee_uid: assigneeUid,
          },
        ],
      });

      return {
        output: {
          success: true,
          message: assigneeUid
            ? `Successfully assigned episode to ${assigneeUid}`
            : 'Successfully unassigned episode',
        },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'assign episode');
    }
  },
});
