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
  CORRELATE_THREAT_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { correlateThreat } from '../../../threat_intelligence/services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

/**
 * Portability wrapper around POST {@link CORRELATE_THREAT_API_PATH}.
 *
 * Runs the full correlation pipeline in-process:
 *   1. extract_diamond (raw_text mode only)
 *   2. search_by_anchors + search_by_diamond in parallel
 *   3. keyword gap-fill (§3)
 *   4. collapse dedup (§4)
 *   5. triage (§5, Sonnet-tier)
 *   6. synthesize_correlations (§6, Opus-tier)
 *
 * Runs entirely in-process — no HTTP round-trip, no 120 s route timeout.
 * Expect 30–90 s total wall time (4 sequential LLM calls). The response
 * includes a `trace` field with per-stage token counts and cost.
 *
 * Per-stage connectors are resolved from advanced settings via
 * DIAMOND_CONNECTOR_SETTING_KEY / TRIAGE_CONNECTOR_SETTING_KEY /
 * SYNTHESIS_CONNECTOR_SETTING_KEY — the same logic as the HTTP route, with
 * graceful fallback to the space-wide genAi default connector.
 * Triage confidence floor and candidate cap are read from
 * TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY / TRIAGE_TOP_N_SETTING_KEY.
 *
 * Gated on `.correlate` privilege at the HTTP route; this tool runs in-process.
 */
const correlateThreatSchema = z
  .object({
    raw_text: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Full text of a threat report, investigation case, or analyst notes to correlate ' +
          'against the knowledge base. Diamond extraction is run first to build per-vertex queries. ' +
          'Mutually exclusive with `report_id`.'
      ),
    report_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Elasticsearch _id of an already-stored report in `.kibana-threat-reports-*`. ' +
          'The service fetches its stored anchor fields and extracted diamond for retrieval, ' +
          'skipping the extraction LLM call. Mutually exclusive with `raw_text`.'
      ),
    depth: z
      .enum(['extract', 'knn', 'triage', 'full'])
      .optional()
      .default('full')
      .describe(
        'How far to run the pipeline. ' +
          '`extract`: diamond extraction only (~secs, ~$0). ' +
          '`knn`: + anchor/diamond retrieval → per-vertex candidates + scores (~secs, ~$0). ' +
          '`triage`: + gap-fill/dedup/triage → scored candidate set (~30s, ~$0.24). ' +
          '`full`: + Opus synthesis → CorrelationFindings (~30–90s, ~$2.35). Default full.'
      ),
  })
  .refine((b) => Boolean(b.raw_text) !== Boolean(b.report_id), {
    message: 'Exactly one of raw_text or report_id is required',
  });

export const correlateThreatTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof correlateThreatSchema> => ({
  id: THREAT_INTEL_TOOL_IDS.correlateThreat,
  type: ToolType.builtin,
  description:
    'Primary correlation entry point — runs the threat-correlation pipeline against the knowledge ' +
    'base. Choose `depth` to trade cost for detail: ' +
    '`extract` (~secs, ~$0): diamond extraction only — returns the extracted diamond. ' +
    '`knn` (~secs, ~$0): + anchor/diamond kNN retrieval — returns per-vertex candidates + scores. ' +
    '`triage` (~30 s, ~$0.24): + gap-fill/dedup/triage — returns scored candidate set. ' +
    '`full` (~30–90 s, ~$2.35): + Opus synthesis — returns CorrelationFindings with leads ' +
    '(same_campaign | same_actor | shared_tradecraft), no_match list, synthesis narrative, and ' +
    'trace. Result shape varies by depth; all shapes carry a `trace` with per-stage spend. ' +
    'Accepts raw report text (`raw_text`) or a stored report ID (`report_id`). ' +
    'Use extract/knn/triage for retrieval-only or cost-sensitive callers. ' +
    `Wraps POST ${CORRELATE_THREAT_API_PATH}, runs in-process (no route timeout). ` +
    'Call `search_by_anchors`, `search_by_diamond`, or `extract_diamond` individually only when ' +
    'you need intermediate results for step-by-step reasoning.',
  schema: correlateThreatSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, spaceId, request, savedObjectsClient }) => {
    const [coreStart, depsStart] = await core.getStartServices();
    const inference = depsStart.inference;
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);

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

    const input = params.raw_text
      ? ({ mode: 'raw_text', text: params.raw_text } as const)
      : ({ mode: 'report_id', report_id: params.report_id as string } as const);

    try {
      const depthResult = await correlateThreat({
        esClient: esClient.asCurrentUser,
        inference,
        request,
        uiSettingsClient,
        logger,
        spaceId,
        input,
        depth: params.depth,
      });

      return { results: [{ type: ToolResultType.other, data: depthResult }] };
    } catch (err) {
      logger.warn(`correlate_threat tool failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `correlate_threat failed: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
});
