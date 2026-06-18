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
import type { Logger } from '@kbn/logging';
import {
  THREAT_INTEL_TOOL_IDS,
  CORRELATION_RUN_STALE_MS,
} from '../../../../common/threat_intelligence/hub';
import { createRunDataClient } from '../../../threat_intelligence/correlation_runs/run_data_client';
import { SYNTHESIS_GUIDANCE } from '../../../threat_intelligence/services/synthesis_guidance';

const correlatePollSchema = z.object({
  runId: z.string().min(1).describe('The runId returned by `correlate_start`.'),
});

/**
 * Polls a background correlation run started by `correlate_start`.
 * Returns {status, stage, partials, result, error}.
 * Poll until status is "succeeded" or "failed".
 */
export const correlatePollTool = (
  logger: Logger
): BuiltinToolDefinition<typeof correlatePollSchema> => ({
  id: THREAT_INTEL_TOOL_IDS.correlatePoll,
  type: ToolType.builtin,
  description:
    'Poll a background correlation run started by `correlate_start`. ' +
    'Returns {status, stage, partials, result, error}. ' +
    'Call repeatedly until status is "succeeded" or "failed" (suggest 10–15 s between polls). ' +
    '`partials` is populated incrementally as each pipeline stage completes — ' +
    '`partials.extract` (diamond), `partials.knn` (anchor+diamond hits), ' +
    '`partials.triage` (scored picks), `partials.synthesize` (findings) — ' +
    'so you can surface intermediate output before the run finishes. ' +
    '`result` holds the final depth-tagged output once status is "succeeded". ' +
    '`error` is set when status is "failed". ' +
    'For triage/knn depth, results include a `synthesis_guidance` block (relationship taxonomy, ' +
    'confidence calibration, evidence weighting + recommended output schema) — follow it when ' +
    'synthesizing the correlation yourself. (A structurally-blinded candidate surface for ' +
    'independent judging is provided separately by `correlate_synthesis_pack`.)',
  schema: correlatePollSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, spaceId }) => {
    const esCurrentUser = esClient.asCurrentUser;
    const runDataClient = createRunDataClient({ esClient: esCurrentUser, logger, spaceId });

    try {
      const run = await runDataClient.getRun(params.runId);

      if (!run) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Correlation run '${params.runId}' not found` },
            },
          ],
        };
      }

      // Mirror the stale-run guard from the HTTP GET route.
      let effectiveStatus = run.status;
      let effectiveError = run.error;
      if (run.status === 'running') {
        const ageMs = Date.now() - new Date(run.updatedAt).getTime();
        if (ageMs > CORRELATION_RUN_STALE_MS) {
          effectiveStatus = 'failed';
          effectiveError = 'Run timed out: no progress update in the last 5 minutes';
        }
      }

      const resultDepth = run.result?.depth;
      const synthesisGuidance =
        resultDepth === 'triage' || resultDepth === 'knn' ? SYNTHESIS_GUIDANCE : undefined;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: effectiveStatus,
              stage: run.stage,
              partials: run.partials,
              result: run.result,
              error: effectiveError,
              ...(synthesisGuidance !== undefined ? { synthesis_guidance: synthesisGuidance } : {}),
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(
        `[correlate_poll] Failed to retrieve run '${params.runId}': ${(e as Error).message}`
      );
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to retrieve correlation run: ${(e as Error).message}`,
            },
          },
        ],
      };
    }
  },
});
