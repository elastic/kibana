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
  EXTRACT_DIAMOND_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { extractDiamond } from '../../../threat_intelligence/services';

/**
 * Portability wrapper around POST {@link EXTRACT_DIAMOND_API_PATH}.
 *
 * Extracts Diamond Model fields (adversary / capability / infrastructure / victim)
 * from raw threat report text using a single heavy LLM call, falling back to
 * four per-vertex calls on parse failure or context overflow.
 *
 * Registered as a registry tool — call via `execute_workflow_step` + `kibana-request`
 * inside Kibana orchestration for proper per-space scoping and per-stage connector
 * settings. Use this tool for 3rd-party or REPL agent contexts.
 */
const extractDiamondSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe(
      'Full text of a threat report or case observation to extract Diamond Model fields from. ' +
        `Truncated to ${30_000} chars internally — supply the richest available excerpt.`
    ),
  report_id: z
    .string()
    .optional()
    .describe(
      'Optional Elasticsearch _id for the source document. Used only for logging and dedup — ' +
        'the source report is excluded from correlation candidate results when this is set.'
    ),
});

export const extractDiamondTool: BuiltinToolDefinition<typeof extractDiamondSchema> = {
  id: THREAT_INTEL_TOOL_IDS.extractDiamond,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${EXTRACT_DIAMOND_API_PATH}. ` +
    'Extract Diamond Model of Intrusion Analysis fields (adversary, capability, infrastructure, ' +
    'victim) from a block of threat report text. Each vertex carries a signal rating ' +
    '(HIGH | PARTIAL | NONE) and a prose characterization for semantic vector search. ' +
    'Use before `search_by_diamond` when you have raw text but no stored report_id, or to ' +
    'inspect what diamond fields a text block would produce.',
  schema: extractDiamondSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { logger, modelProvider }) => {
    let model;
    try {
      model = await modelProvider.getDefaultModel();
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `No GenAI connector available for extract_diamond: ${
                (err as Error).message
              }`,
            },
          },
        ],
      };
    }

    try {
      const data = await extractDiamond(model, logger, {
        text: params.text,
        report_id: params.report_id,
      });
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`extract_diamond tool failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `extract_diamond failed: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
