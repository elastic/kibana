/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  HUNT_FOR_THREAT_API_PATH,
  IOC_TYPES,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { huntForThreat } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `hunt_for_threat` domain action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `HUNT_FOR_THREAT_API_PATH`.
 */
const huntForThreatSchema = z.object({
  report_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Document id in `.kibana-threat-reports-*` whose extracted IOCs + ATT&CK technique IDs should be ' +
        'searched against the environment. Either `report_id` or explicit `iocs[]` / `techniques[]` ' +
        'must be provided.'
    ),
  iocs: z
    .array(
      z.object({
        type: z.enum(IOC_TYPES),
        value: z.string().min(1),
      })
    )
    .optional()
    .describe(
      'Explicit list of IOCs to search for. Overrides anything extracted from `report_id`.'
    ),
  techniques: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Optional list of ATT&CK technique IDs (e.g. ["T1566.001"]) to additionally search for ' +
        'against `.alerts-security.*` via `kibana.alert.rule.threat.technique.id`.'
    ),
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .optional()
    .describe(
      'Window of environment data to hunt across. Defaults to the last 30 days when omitted.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe('Maximum number of hit documents to return.'),
  max_assets: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(50)
    .describe('Maximum number of affected hosts/users to return in the aggregation block.'),
});

export const huntForThreatTool: BuiltinSkillBoundedTool<typeof huntForThreatSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntForThreat,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${HUNT_FOR_THREAT_API_PATH}. ` +
    "Active forward hunt for a threat report's IOCs (and optional ATT&CK technique IDs) " +
    'across the customer environment. Returns top matching documents AND an `affected_assets` ' +
    'aggregation (unique hosts + users). Inside Kibana, prefer calling the route directly via ' +
    '`execute_workflow_step` + `kibana-request`.',
  schema: huntForThreatSchema,
  handler: async (params, { esClient, logger }) => {
    try {
      const data = await huntForThreat(esClient.asCurrentUser, logger, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`hunt_for_threat failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to hunt threat across environment indices: ${
                (err as Error).message
              }.`,
            },
          },
        ],
      };
    }
  },
};
