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
  GLOBAL_SPACE_ID,
  SEVERITY_LEVELS,
  SYNTHESIZE_ADVISORY_API_PATH,
  THREAT_CATEGORIES,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REGIONS,
} from '../../../../common/threat_intelligence/hub';
import { synthesizeAdvisory } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `synthesize_advisory` domain
 * action. Lives on the **registry** because the skill is at its
 * 7-inline-tool hard cap and advisory synthesis is a less-frequent,
 * dashboard-/digest-driven operation. The LLM can still call it
 * directly when the user asks "give me a weekly threat advisory" and
 * an inline tool isn't enough.
 */
const synthesizeAdvisorySchema = z.object({
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .describe('Window of report ingestion timestamps to synthesise across.'),
  categories: z
    .array(z.enum(THREAT_CATEGORIES))
    .optional()
    .describe(
      'Restrict the source report set to these `extracted.categories` values. Same closed ' +
        'enum as the dashboard / digest filters.'
    ),
  regions: z
    .array(z.enum(THREAT_REGIONS))
    .optional()
    .describe('Restrict the source report set to these `geography.regions` values.'),
  min_severity: z
    .enum(SEVERITY_LEVELS)
    .optional()
    .describe('Drop reports with `severity.level` below this floor.'),
  max_reports: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(25)
    .describe(
      'Top-N source reports (by `corroborated_rank_score`, falling back to `rank_score` ' +
        'and `severity.score`) to feed into the LLM prompt. Hard-capped at 50.'
    ),
  description: z
    .string()
    .min(1)
    .max(1000)
    .optional()
    .describe(
      'Optional analyst steering hint, e.g. "focus on `rule_candidate` reports" or "frame ' +
        'as an executive summary". Threaded into the prompt verbatim.'
    ),
  persist: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When `true`, the advisory is written to the `.kibana-threat-intel-advisories` ' +
        'companion index and the response carries an `advisory_id`. Default `false` so ' +
        'ad-hoc LLM-driven invocations do not litter the index.'
    ),
});

export const synthesizeAdvisoryTool: BuiltinSkillBoundedTool<typeof synthesizeAdvisorySchema> = {
  id: THREAT_INTEL_TOOL_IDS.synthesizeAdvisory,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${SYNTHESIZE_ADVISORY_API_PATH}. ` +
    'Synthesise a cross-report weekly / monthly advisory: pulls the top-N reports for a ' +
    'window (sorted by hunt-feedback-corroborated rank), groups by threat actor / category ' +
    '/ region, and asks the LLM to produce a 2-3 paragraph narrative + a short ' +
    'recommended-actions list. When `persist: true`, the advisory is written to the ' +
    '`.kibana-threat-intel-advisories` companion index for dashboard / digest consumption. ' +
    'Inside Kibana orchestration, prefer calling the route directly via ' +
    '`execute_workflow_step` + `kibana-request`.',
  schema: synthesizeAdvisorySchema,
  handler: async (params, { esClient, logger, modelProvider }) => {
    let model;
    try {
      model = await modelProvider.getDefaultModel();
    } catch {
      // Mirror the route: missing GenAI connector → service returns a
      // structured `no_inference` payload rather than failing.
      model = undefined;
    }
    try {
      // Agent Builder tools don't carry a request-scoped space — fall
      // back to the global sentinel so the service still works under
      // single-space deployments. Inside-Kibana orchestration should
      // prefer the HTTP route for proper per-space scoping.
      const data = await synthesizeAdvisory(
        esClient.asCurrentUser,
        model,
        logger,
        GLOBAL_SPACE_ID,
        {
          time_range: params.time_range,
          categories: params.categories,
          regions: params.regions,
          min_severity: params.min_severity,
          max_reports: params.max_reports,
          description: params.description,
          persist: params.persist,
          generated_by: 'agent_builder',
        }
      );
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`synthesize_advisory failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to synthesise advisory: ${(err as Error).message}.`,
            },
          },
        ],
      };
    }
  },
};
