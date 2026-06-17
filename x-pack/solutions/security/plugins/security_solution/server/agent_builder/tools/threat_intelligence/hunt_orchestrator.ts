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
  HUNT_ORCHESTRATED_API_PATH,
  HUNT_TIER2_WHEN_OPTIONS,
  IOC_TYPES,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { huntOrchestrated } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `hunt_orchestrated` domain
 * action. Lives on the **registry** (not the skill's inline tool list)
 * because the threat-intelligence skill is at its 7-inline-tool hard
 * cap and the granular `hunt_for_threat` / `hunt_behavior` tools remain
 * inline for fine-grained control. The orchestrator is the convenience
 * surface for one-call workflows (digest delivery, hit provenance
 * backfill) and for 3rd party agents that prefer a single round-trip.
 *
 * The handler resolves the default model via `modelProvider` (same
 * pattern `hunt_behavior` uses) and threads it into the orchestrator;
 * when GenAI is unavailable, the model is intentionally omitted so the
 * orchestrator returns a Tier-1-only result with
 * `tier2_skipped_reason: 'no_inference'` rather than failing.
 */
const huntOrchestratedSchema = z.object({
  report_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Document id in `.kibana-threat-reports-*` to orchestrate the hunt against. The Tier 1 ' +
        'step resolves `extracted.iocs` and `extracted.ttps.techniques` from this report when ' +
        '`iocs[]` / `techniques[]` are not provided. Required for Tier 2 unless `text` is also ' +
        'passed.'
    ),
  text: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional override for the report text used by the Tier 2 behavioral extractor. When ' +
        'omitted, the orchestrator loads `content.body_text` from `report_id`.'
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
      'Explicit IOC set for Tier 1. Overrides anything extracted from `report_id`. Same shape ' +
        'as the granular `hunt_for_threat` tool accepts.'
    ),
  techniques: z
    .array(z.string().min(1))
    .optional()
    .describe('Optional list of ATT&CK technique IDs to additionally search Tier 1 against.'),
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .optional()
    .describe('Window of environment data to hunt across. Defaults to the last 30 days.'),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe('Maximum number of Tier 1 hit documents to return.'),
  max_assets: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(50)
    .describe('Maximum number of affected hosts / users in the Tier 1 aggregation block.'),
  llm_confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe(
      'Tier 2 LLM-confidence threshold — candidates below this are dropped before catalog validation.'
    ),
  tier2_when: z
    .enum(HUNT_TIER2_WHEN_OPTIONS)
    .optional()
    .default('on_hits')
    .describe(
      'Tier 2 gating policy. `"on_hits"` (tradecraft default) runs Tier 2 only when Tier 1 ' +
        'matched at least once. `"always"` proposes durable rules from the report text even ' +
        'without current activity (useful for digest / advisory flows). `"never"` returns ' +
        'Tier 1 only.'
    ),
  max_tier2_sample_events: z
    .number()
    .int()
    .min(0)
    .max(25)
    .optional()
    .default(5)
    .describe(
      'Maximum number of Tier 1 hit samples to include in the Tier 2 LLM article context. ' +
        'Keeps the prompt bounded; five samples is enough to convey the activity pattern.'
    ),
});

export const huntOrchestratedTool: BuiltinSkillBoundedTool<typeof huntOrchestratedSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntOrchestrated,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${HUNT_ORCHESTRATED_API_PATH}. ` +
    'One-call orchestrated hunt that chains Tier 1 (atomic IOC / technique lookups across ' +
    'the environment) with Tier 2 (LLM-refined behavioral rule proposals against the report ' +
    'text, informed by the Tier 1 affected-asset and sample-event context). Use when you need ' +
    'both "what is currently hitting" AND "what durable rule would catch this in the future" ' +
    'from a single tool call — typical for digest synthesis and per-report deep-dive flows. ' +
    'When fine-grained control is needed, prefer the granular `hunt_for_threat` + ' +
    '`hunt_behavior` tools. Inside Kibana orchestration, prefer calling the route directly ' +
    'via `execute_workflow_step` + `kibana-request`.',
  schema: huntOrchestratedSchema,
  handler: async (params, { esClient, logger, modelProvider }) => {
    let model;
    try {
      model = await modelProvider.getDefaultModel();
    } catch {
      // Match the route behavior: missing GenAI connector → Tier 1 only
      // with `tier2_skipped_reason: 'no_inference'` rather than a hard
      // failure. Logging happens inside the orchestrator's result path.
      model = undefined;
    }
    try {
      const data = await huntOrchestrated(esClient.asCurrentUser, model, logger, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`hunt_orchestrated failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to run orchestrated hunt: ${(err as Error).message}.`,
            },
          },
        ],
      };
    }
  },
};
