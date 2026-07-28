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
  HUNT_BEHAVIOR_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { huntBehavior } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `hunt_behavior` domain action.
 *
 * Lives on the **registry** (not the skill's inline tool list) — the
 * skill is at its 7-inline-tool hard cap and `hunt_orchestrator` (the
 * one-call Tier1+Tier2 default) took the inline slot instead, since
 * live testing showed the model reliably picks whichever hunt tool is
 * immediately visible regardless of description wording. This tool
 * remains fully callable for the "Tier 1 already done" / "skip the IOC
 * sweep" case described below.
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
      'Optional `_id` of the source report in `.kibana-threat-reports-*` as a source-report backlink.'
    ),
  llm_confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Candidates with LLM confidence below this are dropped before catalog validation.'),
});

export const huntBehaviorTool: BuiltinToolDefinition<typeof huntBehaviorSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntBehavior,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${HUNT_BEHAVIOR_API_PATH}. ` +
    'Extract behavioral detection hypotheses from a threat intelligence report and propose ' +
    'durable behavioral detection rules. Two-step algorithm: (1) LLM extracts candidate ' +
    'MITRE ATT&CK technique IDs with evidence quotes; (2) each candidate is validated against ' +
    'the vendored Kibana ATT&CK catalog. Hallucinated or unknown IDs are dropped. Surviving ' +
    'candidates return as behavioral findings with a `proposed_esql_rule` body and a pre-built ' +
    '`threat-intel-finding-card` attachment hint. For a plain "hunt for this report" request, ' +
    'prefer `hunt_orchestrator` instead — it runs this same extraction plus a Tier 1 IOC sweep ' +
    'in one call. Use this tool standalone only when you already have Tier 1 results in hand ' +
    'or explicitly do not want the environment IOC sweep. Agent Builder should call this tool ' +
    'directly; native Workflows and UI surfaces use the matching HTTP route.',
  schema: huntBehaviorSchema,
  tags: ['threat-intel', 'hunt', 'behavior'],
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
