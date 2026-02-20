/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { validateHealthInterval } from '../../../../lib/detection_engine/rule_monitoring/api/detection_engine_health/health_interval';
import type { SkillDependencies } from '../types';
import { SKILL_ID } from '../constants';

export const GET_SPACE_HEALTH_TOOL_ID = `${SKILL_ID}.get_space_health`;

export function getSpaceHealthTool(deps: SkillDependencies): BuiltinSkillBoundedTool {
  const { core, ruleMonitoringService } = deps;

  return {
    id: GET_SPACE_HEALTH_TOOL_ID,
    type: ToolType.builtin,
    description: `Fetches aggregated health overview for all detection rules in the current Kibana space using the Detection Engine Space Health API.

Returns:
- **state_at_the_moment**: Current rule counts (total, enabled/disabled, by type, by origin, by last execution outcome)
- **stats_over_interval**: Aggregated execution stats over the requested time period including:
  - Number of executions (total and by outcome: succeeded, warning, failed)
  - Number of logged messages (by level: error, warn, info, debug)
  - Detected execution gaps (count and total duration)
  - Performance percentiles (p50, p95, p99, p99.9) for: schedule delay, execution duration, search duration, indexing duration
  - Top error and warning messages with occurrence counts
- **history_over_interval**: Time-bucketed histogram of the same stats for trend analysis

**When to use:**
- When investigating overall Detection Engine health in a space
- When checking for widespread rule failures or performance degradation
- When analyzing execution gap trends or scheduling delays
- When comparing rule execution performance across time periods`,
    schema: getSpaceHealthSchema,
    handler: async ({ intervalType, granularity, debug }, { request, spaceId, logger }) => {
      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const eventLogClient = startPlugins.eventLog.getClient(request);

        const healthClient = ruleMonitoringService.createDetectionEngineHealthClient({
          rulesClient,
          eventLogClient,
          currentSpaceId: spaceId,
        });

        const interval = validateHealthInterval({ type: intervalType, granularity }, moment());
        const spaceHealth = await healthClient.calculateSpaceHealth({ interval });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                state_at_the_moment: spaceHealth.state_at_the_moment,
                stats_over_interval: spaceHealth.stats_over_interval,
                history_over_interval: spaceHealth.history_over_interval,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${GET_SPACE_HEALTH_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error fetching space health: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}

const intervalTypeEnum = z.enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year']);
const granularityEnum = z.enum(['minute', 'hour', 'day', 'week', 'month']);

const getSpaceHealthSchema = z.object({
  intervalType: intervalTypeEnum
    .default('last_day')
    .describe(
      'Time period to analyze. Use "last_hour" for immediate issues, "last_day" for recent problems, "last_week" or "last_month" for trend analysis.'
    ),
  granularity: granularityEnum
    .default('hour')
    .describe(
      'Granularity of the histogram buckets. Must be compatible with the interval: last_hour→minute, last_day→minute|hour, last_week→hour|day, last_month→day|week, last_year→week|month.'
    ),
});
