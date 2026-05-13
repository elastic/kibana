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
import { HUNT_BEHAVIOR_API_PATH, THREAT_INTEL_TOOL_IDS } from '../../../common';
import { huntBehavior } from '../../services';

/**
 * Thin Agent Builder tool wrapper for the `hunt_behavior` domain action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `HUNT_BEHAVIOR_API_PATH`. The route resolves a `ScopedModel` via the
 * inference plugin; this tool delegates to the same `huntBehavior`
 * service using the model already provided by the agent-builder runtime.
 */
const huntBehaviorSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe(
      'Free-form report text to analyze (e.g. a vendor advisory, blog post, or analyst paste).'
    ),
  report_id: z
    .string()
    .optional()
    .describe(
      'Optional `_id` of the source report in `.kibana-threat-reports-*` for provenance backlink.'
    ),
  llm_confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Candidates with LLM confidence below this are dropped before catalog validation.'),
});

export const huntBehaviorTool: BuiltinSkillBoundedTool<typeof huntBehaviorSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntBehavior,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${HUNT_BEHAVIOR_API_PATH}. ` +
    'Extract behavioral detection hypotheses from a threat intelligence report and propose ' +
    'durable behavioral detection rules. Two-step algorithm: (1) LLM extracts candidate ' +
    'MITRE ATT&CK technique IDs with evidence quotes; (2) each candidate is validated against ' +
    'the vendored Kibana ATT&CK catalog. Hallucinated or unknown IDs are dropped. Surviving ' +
    'candidates return as behavioral findings with a `proposed_esql_rule` body and a pre-built ' +
    '`threat-intel-finding-card` attachment hint. Inside Kibana, prefer calling the route ' +
    'directly via `execute_workflow_step` + `kibana-request`.',
  schema: huntBehaviorSchema,
  handler: async (params, { logger, modelProvider }) => {
    try {
      const model = await modelProvider.getDefaultModel();
      const data = await huntBehavior(model, logger, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`hunt_behavior failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `LLM extraction failed: ${(err as Error).message}. ` +
                `Verify a default inference connector is configured.`,
            },
          },
        ],
      };
    }
  },
};
