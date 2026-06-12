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
  DIAMOND_CONNECTOR_SETTING_KEY,
  TRIAGE_CONNECTOR_SETTING_KEY,
  SYNTHESIS_CONNECTOR_SETTING_KEY,
  TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY,
  TRIAGE_TOP_N_SETTING_KEY,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { correlateThreat } from '../../../threat_intelligence/services';
import { resolveScopedModel } from '../../../threat_intelligence/routes/lib/scoped_model';
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
  handler: async (params, { esClient, spaceId, request, savedObjectsClient }) => {
    const [coreStart, depsStart] = await core.getStartServices();
    const inference = depsStart.inference;
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);

    const readStringSetting = async (key: string): Promise<string | undefined> => {
      try {
        const v = await uiSettingsClient.get<string>(key);
        return v || undefined;
      } catch {
        return undefined;
      }
    };

    const readNumberSetting = async (key: string, fallback: number): Promise<number> => {
      try {
        const v = await uiSettingsClient.get<number>(key);
        return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
      } catch {
        return fallback;
      }
    };

    const [diamondConnectorId, triageConnectorId, synthesisConnectorId, triageFloor, triageTopN] =
      await Promise.all([
        readStringSetting(DIAMOND_CONNECTOR_SETTING_KEY),
        readStringSetting(TRIAGE_CONNECTOR_SETTING_KEY),
        readStringSetting(SYNTHESIS_CONNECTOR_SETTING_KEY),
        readNumberSetting(TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY, 0.65),
        readNumberSetting(TRIAGE_TOP_N_SETTING_KEY, 75),
      ]);

    // Resolve the extraction model eagerly so misconfigured deployments fail fast.
    // Required only for raw_text mode; !ok is treated as undefined for report_id.
    const extractionModelOutcome = await resolveScopedModel({
      inference,
      request,
      uiSettingsClient,
      connectorIdOverride: diamondConnectorId,
      logger,
    });

    if (!extractionModelOutcome.ok && params.raw_text) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: extractionModelOutcome.message },
          },
        ],
      };
    }

    const triageModelOutcome = await resolveScopedModel({
      inference,
      request,
      uiSettingsClient,
      connectorIdOverride: triageConnectorId,
      logger,
    });

    if (!triageModelOutcome.ok) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Triage model unavailable: ${triageModelOutcome.message}` },
          },
        ],
      };
    }

    const synthesisModelOutcome = await resolveScopedModel({
      inference,
      request,
      uiSettingsClient,
      connectorIdOverride: synthesisConnectorId,
      logger,
    });

    if (!synthesisModelOutcome.ok) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Synthesis model unavailable: ${synthesisModelOutcome.message}` },
          },
        ],
      };
    }

    const extractionModel = extractionModelOutcome.ok ? extractionModelOutcome.model : undefined;
    const { model: triageModel } = triageModelOutcome;
    const { model: synthesisModel } = synthesisModelOutcome;

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
        triageFloor,
        triageTopN,
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
});
