/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, ScopedModel } from '@kbn/agent-builder-server';
import {
  CORRELATE_THREAT_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { correlateThreat } from '../../../threat_intelligence/services';

// Mirrors the route defaults (read from uiSettings there; hardcoded here for tool context).
const DEFAULT_TRIAGE_FLOOR = 0.65;
const DEFAULT_TRIAGE_TOP_N = 75;

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
 * Per-stage connector overrides (DIAMOND_CONNECTOR_SETTING_KEY etc.) are NOT
 * applied in this tool context — all three model tiers use the connector
 * selected by modelProvider. For per-stage connector control, call the HTTP
 * route directly via `execute_workflow_step` + `kibana-request`.
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
  })
  .refine((b) => Boolean(b.raw_text) !== Boolean(b.report_id), {
    message: 'Exactly one of raw_text or report_id is required',
  });

export const correlateThreatTool: BuiltinToolDefinition<typeof correlateThreatSchema> = {
  id: THREAT_INTEL_TOOL_IDS.correlateThreat,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${CORRELATE_THREAT_API_PATH}. ` +
    'Run the full threat-correlation pipeline against the knowledge base. Accepts raw report ' +
    'text (`raw_text`) or a stored report ID (`report_id`). Runs four LLM stages in sequence ' +
    '(extract → triage → synthesis) — expect 30–90 s total. Returns `CorrelationFindings` ' +
    'with leads (same_campaign | same_actor | shared_tradecraft), no_match list, synthesis ' +
    'narrative, and a `trace` with per-stage token counts and cost. ' +
    'Use this as the primary correlation entry point. Call `search_by_anchors`, ' +
    '`search_by_diamond`, or `extract_diamond` individually only when you need intermediate ' +
    'results for step-by-step reasoning.',
  schema: correlateThreatSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, logger, spaceId, modelProvider }) => {
    let triageModel: ScopedModel;
    let synthesisModel: ScopedModel;
    try {
      [triageModel, synthesisModel] = await Promise.all([
        modelProvider.selectModel({ effortLevel: 'medium' }),
        modelProvider.selectModel({ effortLevel: 'high' }),
      ]);
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `No GenAI connector available for correlate_threat: ${(err as Error).message}. ` +
                'Configure a connector in Kibana Advanced Settings.',
            },
          },
        ],
      };
    }

    let extractionModel: ScopedModel | undefined;
    if (params.raw_text) {
      try {
        extractionModel = await modelProvider.getDefaultModel();
      } catch {
        // correlateThreat will surface a clear error for raw_text with no extraction model.
        extractionModel = undefined;
      }
    }

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
      const data = await correlateThreat({
        esClient: esClient.asCurrentUser,
        extractionModel,
        triageModel,
        synthesisModel,
        logger,
        spaceId,
        input,
        triageFloor: DEFAULT_TRIAGE_FLOOR,
        triageTopN: DEFAULT_TRIAGE_TOP_N,
      });
      return { results: [{ type: ToolResultType.other, data }] };
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
};
