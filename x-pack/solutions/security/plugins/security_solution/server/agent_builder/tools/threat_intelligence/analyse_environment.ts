/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  ANALYSE_ENVIRONMENT_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { analyseEnvironment } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `analyse_environment` domain
 * action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `ANALYSE_ENVIRONMENT_API_PATH`.
 */
const analyseEnvironmentSchema = z.object({
  lookback_days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .optional()
    .default(7)
    .describe('How many days back to sample for activity. Defaults to 7.'),
  index_patterns: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Override the index patterns the profile is built from. Defaults to a curated set ' +
        'covering Elastic Defend, AWS, Azure, GCP, network traffic, and vulnerability scanners.'
    ),
});

export const analyseEnvironmentTool: BuiltinToolDefinition<typeof analyseEnvironmentSchema> = {
  id: THREAT_INTEL_TOOL_IDS.analyseEnvironment,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${ANALYSE_ENVIRONMENT_API_PATH}. ` +
    'Profile the customer environment to tailor threat-intelligence feed recommendations. ' +
    'Returns: (a) active integration data streams with hit counts; (b) the OS family mix ' +
    '(windows / linux / macos); (c) the cloud-provider mix (aws / gcp / azure). Inside Kibana, ' +
    'prefer calling the route directly via `execute_workflow_step` + `kibana-request`.',
  schema: analyseEnvironmentSchema,
  tags: ['threat-intel', 'environment-profile'],
  handler: async (params, { esClient, logger }) => {
    try {
      const data = await analyseEnvironment(esClient.asCurrentUser, logger, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`analyse_environment failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to profile environment: ${(err as Error).message}.` },
          },
        ],
      };
    }
  },
};
