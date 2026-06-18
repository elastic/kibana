/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import {
  THREAT_INTEL_TOOL_IDS,
  CORRELATION_RUNS_MAX_CONCURRENT,
} from '../../../../common/threat_intelligence/hub';
import { createRunDataClient } from '../../../threat_intelligence/correlation_runs/run_data_client';
import { createRunIndexService } from '../../../threat_intelligence/correlation_runs/run_index_service';
import { correlateThreat } from '../../../threat_intelligence/services/correlate_threat';
import type { CorrelateThreatDepthResult } from '../../../threat_intelligence/services/correlate_threat';
import type {
  CorrelationRunResult,
  CorrelationRunPartials,
} from '../../../../common/threat_intelligence/correlation_runs';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

const INPUT_SUMMARY_MAX_LENGTH = 200;

const toRunResult = (depthResult: CorrelateThreatDepthResult): CorrelationRunResult => {
  if (depthResult.depth === 'full') {
    return { depth: 'full', findings: depthResult.findings };
  }
  if (depthResult.depth === 'triage') {
    return {
      depth: 'triage',
      picks: depthResult.picks as unknown as Array<{
        candidate_id: string;
        confidence: number;
        justification: string;
      }>,
      groups: depthResult.groups as unknown as Array<{
        hypothesis: string;
        candidates: Array<{ candidate_id: string; confidence: number; justification: string }>;
      }>,
      triaged_out: depthResult.triaged_out as unknown as Array<{
        candidate_id: string;
        score: number;
        reason: 'below_floor' | 'not_selected';
      }>,
      candidates_fed: depthResult.candidates_fed,
      fallback_used: depthResult.fallback_used,
      candidate_meta: depthResult.candidate_meta,
    };
  }
  if (depthResult.depth === 'knn') {
    return {
      depth: 'knn',
      anchor_hits: depthResult.anchor_hits.hits as unknown as Array<{
        report_id: string;
        title: string;
        match_breakdown: Record<string, unknown>;
      }>,
      diamond_hits: depthResult.diamond_hits.hits as unknown as Array<{
        report_id: string;
        title: string;
        overlap: number;
        score: number;
        vertex_scores: Record<string, number>;
      }>,
      merged: depthResult.merged as unknown as Array<{
        report_id: string;
        title: string;
        overlap: number;
        score: number;
        vertex_scores: Record<string, number>;
        match_breakdown?: Record<string, unknown>;
      }>,
      candidate_meta: depthResult.candidate_meta,
    };
  }
  return { depth: 'extract', diamond: depthResult.diamond };
};

const buildStagePartials = (
  stage: string,
  stageResult: unknown
): Partial<CorrelationRunPartials> | undefined => {
  if (!stageResult || typeof stageResult !== 'object') return undefined;
  const r = stageResult as Record<string, unknown>;
  if (stage === 'extract' && r.depth === 'extract') {
    return { extract: r as CorrelationRunPartials['extract'] };
  }
  if (stage === 'search' && r.depth === 'knn') {
    return { knn: r as CorrelationRunPartials['knn'] };
  }
  if (stage === 'triage' && r.depth === 'triage') {
    return { triage: r as CorrelationRunPartials['triage'] };
  }
  if (stage === 'synthesize' && r.depth === 'full') {
    return { synthesize: r as CorrelationRunPartials['synthesize'] };
  }
  return undefined;
};

const correlateStartSchema = z
  .object({
    raw_text: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Full text of a threat report or analyst notes to correlate against the knowledge base. ' +
          'Mutually exclusive with `report_id`.'
      ),
    report_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Elasticsearch _id of an already-stored report. The stored diamond is used for retrieval, ' +
          'skipping the extraction LLM call. Mutually exclusive with `raw_text`.'
      ),
    depth: z
      .enum(['extract', 'knn', 'triage', 'full'])
      .optional()
      .default('full')
      .describe(
        'How far to run the pipeline. ' +
          '`full` runs all six phases (30–90 s, ~$2.35). ' +
          '`triage` stops after the triage LLM (~30 s, ~$0.24). ' +
          '`knn` stops after retrieval (~secs, ~$0). ' +
          '`extract` stops after diamond extraction (~secs, ~$0). Default full.'
      ),
  })
  .refine((b) => Boolean(b.raw_text) !== Boolean(b.report_id), {
    message: 'Exactly one of raw_text or report_id is required',
  });

/**
 * Starts a background correlation run and returns {runId} in <1 s.
 * Use `correlate_poll` to retrieve status and per-stage results.
 */
export const correlateStartTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof correlateStartSchema> => ({
  id: THREAT_INTEL_TOOL_IDS.correlateStart,
  type: ToolType.builtin,
  description:
    'Start a background threat-correlation run and return {runId} in <1 s (avoids the 120 s ' +
    'proxy wall that the synchronous correlate_threat full path hits). ' +
    'Then poll `correlate_poll` with the returned runId until status is "succeeded" or "failed". ' +
    "`partials` in the poll response shows each stage's output as it completes: " +
    'extract→diamond, search→knn result, triage→picks/groups, synthesize→findings. ' +
    'Use this tool — not correlate_threat — for full-depth (30–90 s) correlation over MCP.',
  schema: correlateStartSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, spaceId, request, savedObjectsClient }) => {
    if (!params.raw_text && !params.report_id) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Exactly one of raw_text or report_id is required' },
          },
        ],
      };
    }

    const [coreStart, depsStart] = await core.getStartServices();
    const inference = depsStart.inference;
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
    const esCurrentUser = esClient.asCurrentUser;

    const runDataClient = createRunDataClient({ esClient: esCurrentUser, logger, spaceId });

    const activeCount = await runDataClient.countActiveRuns();
    if (activeCount >= CORRELATION_RUNS_MAX_CONCURRENT) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `Too many concurrent correlation runs (max ${CORRELATION_RUNS_MAX_CONCURRENT} per space). ` +
                'Wait for existing runs to complete.',
            },
          },
        ],
      };
    }

    const runId = uuidv4();
    const now = new Date().toISOString();
    const depth = params.depth ?? 'full';

    const inputSummary = params.raw_text
      ? params.raw_text.slice(0, INPUT_SUMMARY_MAX_LENGTH)
      : params.report_id;

    const input = params.raw_text
      ? ({ mode: 'raw_text', text: params.raw_text } as const)
      : ({ mode: 'report_id', report_id: params.report_id as string } as const);

    try {
      const runIndexService = createRunIndexService({ esClient: esCurrentUser, logger, spaceId });
      await runIndexService.ensureIndex();
      await runDataClient.createRun({
        runId,
        spaceId,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        input_type: params.raw_text ? 'raw_text' : 'report_id',
        report_id: params.report_id,
        input_summary: inputSummary,
        title: inputSummary,
        depth,
        status: 'pending',
      });
    } catch (e) {
      logger.error(`[correlate_start] Failed to create run record '${runId}': ${e}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to create correlation run record: ${(e as Error).message}` },
          },
        ],
      };
    }

    // Spawn background pipeline — same pattern as create_run.ts route.
    void (async () => {
      await runDataClient.updateRun(runId, {
        status: 'running',
        updatedAt: new Date().toISOString(),
      });

      try {
        const depthResult = await correlateThreat({
          esClient: esCurrentUser,
          inference,
          request,
          uiSettingsClient,
          logger,
          spaceId,
          input,
          depth,
          onStage: async (stage, stageResult) => {
            const stagePartials = buildStagePartials(stage, stageResult);
            await runDataClient.updateRun(runId, {
              stage,
              ...(stagePartials ? { partials: stagePartials } : {}),
              updatedAt: new Date().toISOString(),
            });
          },
        });

        const caseTitleUpdate =
          depthResult.depth === 'full' && depthResult.findings.synthesis.case_title
            ? depthResult.findings.synthesis.case_title
            : undefined;

        await runDataClient.updateRun(runId, {
          status: 'succeeded',
          stage: 'done',
          result: toRunResult(depthResult),
          ...(caseTitleUpdate !== undefined ? { title: caseTitleUpdate } : {}),
          updatedAt: new Date().toISOString(),
        });

        logger.info(`[correlate_start] Background run succeeded (runId=${runId}, depth=${depth})`);
      } catch (pipelineError) {
        const errorMessage =
          pipelineError instanceof Error ? pipelineError.message : String(pipelineError);
        logger.error(`[correlate_start] Background run failed (runId=${runId}): ${errorMessage}`);
        await runDataClient
          .updateRun(runId, {
            status: 'failed',
            error: errorMessage,
            updatedAt: new Date().toISOString(),
          })
          .catch((e: Error) =>
            logger.warn(
              `[correlate_start] Failed to persist error state (runId=${runId}): ${e.message}`
            )
          );
      }
    })();

    return { results: [{ type: ToolResultType.other, data: { runId } }] };
  },
});
