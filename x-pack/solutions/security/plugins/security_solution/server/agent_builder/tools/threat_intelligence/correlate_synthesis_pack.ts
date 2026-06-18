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
import { THREAT_INTEL_TOOL_IDS } from '../../../../common/threat_intelligence/hub';
import { correlateThreat } from '../../../threat_intelligence/services';
import { SYNTHESIS_GUIDANCE_TEXT } from '../../../threat_intelligence/services/synthesis_guidance';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

const correlateSynthesisPackSchema = z
  .object({
    raw_text: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Full text of a threat report, investigation case, or analyst notes to correlate ' +
          'against the knowledge base. Mutually exclusive with `report_id`.'
      ),
    report_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Elasticsearch _id of an already-stored report in `.kibana-threat-reports-*`. ' +
          'Mutually exclusive with `raw_text`.'
      ),
  })
  .refine((b) => Boolean(b.raw_text) !== Boolean(b.report_id), {
    message: 'Exactly one of raw_text or report_id is required',
  });

/** Fisher-Yates in-place shuffle. */
const shuffleInPlace = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const correlateSynthesisPackTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof correlateSynthesisPackSchema> => ({
  id: THREAT_INTEL_TOOL_IDS.correlateSynthesisPack,
  type: ToolType.builtin,
  description:
    'Run a correlation and get a structurally-blinded candidate pack for independent ' +
    'self-synthesis: triage candidates in randomized order with our confidence scores and ' +
    'rankings removed, plus the synthesis rubric. ' +
    '`picks` = candidates selected by triage — analyze deeply (pair with get_report to fetch ' +
    'full text); ' +
    '`also_considered` = the non-selected retrieval set — provided for completeness; only fetch ' +
    'their text if you want to challenge the selection. ' +
    'Use this (not `correlate_threat depth=triage`, which returns our scores) when you want a ' +
    'bias-reduced independent judgment — our triage scores and rankings are stripped so you ' +
    'cannot anchor on them. Accepts raw report text (`raw_text`) or a stored report ID ' +
    '(`report_id`). ~$0.30, ~70 s.',
  schema: correlateSynthesisPackSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, spaceId, request, savedObjectsClient }) => {
    const [coreStart, depsStart] = await core.getStartServices();
    const inference = depsStart.inference;
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);

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
        depth: 'triage',
      });

      if (depthResult.depth !== 'triage') {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Unexpected depth result from correlateThreat' },
            },
          ],
        };
      }

      const { picks, triaged_out, candidate_meta } = depthResult;

      // Build blind stubs — keep only identifying metadata, strip all scores/rankings.
      interface BlindEntry {
        report_id: string;
        title: string;
        vendor: string;
        url: string;
      }

      const toBlindEntry = (candidateId: string): BlindEntry => {
        const meta = candidate_meta?.[candidateId];
        return {
          report_id: candidateId,
          title: meta?.title ?? candidateId,
          vendor: meta?.vendor ?? '',
          url: meta?.url ?? '',
        };
      };

      const blindPicks: BlindEntry[] = shuffleInPlace(
        picks.map((p) => toBlindEntry(p.candidate_id))
      );
      const blindAlsoConsidered: BlindEntry[] = shuffleInPlace(
        triaged_out.map((t) => toBlindEntry(t.candidate_id))
      );

      const synthesisPack = {
        picks: blindPicks,
        also_considered: blindAlsoConsidered,
        instructions: SYNTHESIS_GUIDANCE_TEXT,
        method_note:
          'Candidates are in randomized order with our triage confidence scores and rankings ' +
          'removed, so your relationship judgment is independent. DEEPLY ANALYZE THE `picks`: ' +
          'fetch their full text via get_report(report_ids) and synthesize per the instructions. ' +
          '`also_considered` were surfaced by retrieval but NOT selected by triage — provided ' +
          'for completeness; only fetch their text if you want to challenge the selection. ' +
          'Do not seek or infer our internal scores.',
      };

      return { results: [{ type: ToolResultType.other, data: { synthesis_pack: synthesisPack } }] };
    } catch (err) {
      logger.warn(`correlate_synthesis_pack tool failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `correlate_synthesis_pack failed: ${(err as Error).message}`,
            },
          },
        ],
      };
    }
  },
});
