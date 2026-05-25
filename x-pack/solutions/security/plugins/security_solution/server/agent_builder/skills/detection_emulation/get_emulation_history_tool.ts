/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { findEmulationHistory } from '../../../lib/detection_emulation/emulation_history';
import { emulationReportTypeName } from '../../../lib/detection_emulation/emulation_report_type';
import { toolError } from './emulation_tool_errors';

// ─── Schema ───────────────────────────────────────────────────────────────────

const getEmulationHistorySchema = z.object({
  ruleId: z
    .string()
    .min(1)
    .describe(
      'Detection rule UUID to retrieve history for. Returns all emulation runs recorded against this rule, newest first.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Maximum number of history records to return (1–100). Defaults to 20. Increase when you need to analyse a longer trend window (e.g. confidence drift over the last 50 runs).'
    ),
});

// ─── Tool ─────────────────────────────────────────────────────────────────────

export interface GetEmulationHistoryToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
}

/**
 * Creates the getEmulationHistory tool for the detection emulation Agent Builder skill.
 *
 * Returns a paginated list of `detection-emulation-report` saved objects for a
 * given rule, sorted newest-first. Each item carries the full confidence scores,
 * per-phase breakdown, and dispatch metadata from the original validation run.
 */
export const createGetEmulationHistoryTool = (
  deps: GetEmulationHistoryToolDeps
): BuiltinSkillBoundedTool<typeof getEmulationHistorySchema> => {
  const { core, logger } = deps;

  return {
    id: 'security.detection-emulation.get-history',
    type: ToolType.builtin,
    description: `Retrieve past emulation validation runs for a detection rule.

Returns a list of \`detection-emulation-report\` records for the specified rule, sorted newest-first. Each record contains the confidence score, coverage, precision, TP/FP counts, payload techniques, dispatch mode, and timestamps from the original \`validateRule\` run.

Use this tool to:
- Check whether a rule has been validated before and what score it achieved.
- Identify confidence trends across successive emulation runs.
- Provide context before triggering a new \`validateRule\` run (e.g. "the last run scored 0.75 — would you like to re-run?").
- Surface which MITRE techniques were covered in previous runs (\`payloadIds\`).

Results are scoped to the current Kibana space — reports from other spaces are not visible.`,
    schema: getEmulationHistorySchema,
    handler: async ({ ruleId, limit }, { request }) => {
      try {
        const [coreStart] = await core.getStartServices();

        const soClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [emulationReportTypeName],
        });

        const result = await findEmulationHistory({ ruleId, perPage: limit ?? 20 }, { soClient });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                rule_id: ruleId,
                total: result.total,
                page: result.page,
                per_page: result.perPage,
                items: result.items.map((item) => ({
                  report_id: item.id,
                  rule_id: item.attributes.ruleId,
                  mode: item.attributes.mode,
                  confidence: item.attributes.score.confidence,
                  coverage: item.attributes.score.coverage,
                  precision: item.attributes.score.precision,
                  tp: item.attributes.score.tp,
                  fp: item.attributes.score.fp,
                  payload_ids: item.attributes.payloadIds,
                  agent_type: item.attributes.agentType,
                  operator: item.attributes.operator,
                  started_at: item.attributes.startedAt,
                  completed_at: item.attributes.completedAt,
                })),
              },
            },
          ],
        };
      } catch (err) {
        const error = err as Error;
        logger.error(`[get_emulation_history tool] Failed for rule [${ruleId}]: ${error.message}`, {
          tags: ['detection-emulation'],
          stack: error.stack,
        } as Record<string, unknown>);
        return toolError.executionError(
          { rule_id: ruleId },
          {
            message: 'Failed to retrieve emulation history.',
            likelyCause: 'Internal error querying the emulation history saved objects.',
          }
        );
      }
    },
  };
};
