/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { setEpisodeStatusStepCommonDefinition } from '../../../../common/workflows/step_types/set_episode_status_step/set_episode_status_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

const BULK_ACTION_PATH = `${ALERTING_V2_ALERT_API_PATH}/_bulk_action`;

// v2 has no open/acknowledged/closed field: each "status" maps to an action appended to
// `.alert-actions`. ack/unack are episode-scoped; resolve/unresolve (deactivate/activate) are
// series-scoped and record a reason.
export const setEpisodeStatusStepDefinition = createServerStepDefinition({
  ...setEpisodeStatusStepCommonDefinition,
  handler: async (context) => {
    const { group_hash: groupHash, episode_id: episodeId, status, reason } = context.input;

    let item: Record<string, unknown>;
    switch (status) {
      case 'acknowledged':
        item = {
          group_hash: groupHash,
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: episodeId,
        };
        break;
      case 'unacknowledged':
        item = {
          group_hash: groupHash,
          action_type: ALERT_EPISODE_ACTION_TYPE.UNACK,
          episode_id: episodeId,
        };
        break;
      case 'resolved':
        item = {
          group_hash: groupHash,
          action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          reason: reason ?? 'Resolved by workflow',
        };
        break;
      case 'unresolved':
        item = {
          group_hash: groupHash,
          action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
          reason: reason ?? 'Reopened by workflow',
        };
        break;
      default:
        throw new Error(`Unsupported episode status: ${status}`);
    }

    try {
      await context.contextManager.callKibanaApi<{
        affected_count?: number;
        errors?: unknown[];
      }>({
        method: 'POST',
        path: BULK_ACTION_PATH,
        body: [item],
      });

      return {
        output: { success: true, message: `Successfully set episode status to ${status}` },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'set episode status');
    }
  },
});
