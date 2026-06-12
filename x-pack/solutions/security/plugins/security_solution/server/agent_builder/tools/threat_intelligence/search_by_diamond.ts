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
  SEARCH_BY_DIAMOND_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { searchByDiamond } from '../../../threat_intelligence/services';

/**
 * Portability wrapper around POST {@link SEARCH_BY_DIAMOND_API_PATH}.
 *
 * Semantic Diamond Model correlation search — kNN over extracted.diamond.*.summary
 * embeddings, queried per vertex, merged by (overlap DESC, score DESC).
 * Gated on `.correlate` privilege at the HTTP route; this tool runs in-process.
 */
const searchByDiamondSchema = z.object({
  source_report_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Elasticsearch _id of a stored threat report. The service uses its non-NONE ' +
        'extracted.diamond.*.summary values as per-vertex queries. ' +
        'Mutually exclusive with `vertex_queries`.'
    ),
  vertex_queries: z
    .object({
      adversary: z
        .string()
        .optional()
        .describe('Prose describing the adversary/operator to search for semantically.'),
      capability: z
        .string()
        .optional()
        .describe('Prose describing tools, techniques, or ATT&CK behaviors to search for.'),
      infrastructure: z
        .string()
        .optional()
        .describe('Prose describing C2 infrastructure, hosting, or network topology.'),
      victim: z
        .string()
        .optional()
        .describe('Prose describing victim profile, industry vertical, or geographic targeting.'),
    })
    .optional()
    .describe(
      'Free-text queries per Diamond Model vertex. Omit vertices you have no information about. ' +
        'Provide either `vertex_queries` or `source_report_id`, not both.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe('Maximum hits to return (1–50, default 20).'),
});

export const searchByDiamondTool: BuiltinToolDefinition<typeof searchByDiamondSchema> = {
  id: THREAT_INTEL_TOOL_IDS.searchByDiamond,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${SEARCH_BY_DIAMOND_API_PATH}. ` +
    'Semantic Diamond Model correlation search: kNN over extracted.diamond.*.summary embeddings, ' +
    'one query per provided vertex, results merged by (vertex-overlap DESC, max-score DESC). ' +
    'Use when you have prose descriptions of adversary behavior, capabilities, infrastructure, ' +
    'or victim profile and want to find semantically related reports. Returns per-vertex scores ' +
    'and overlap count per hit. Complement with `search_by_anchors` (exact) for full coverage — ' +
    '`correlate_threat` runs both in parallel.',
  schema: searchByDiamondSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, logger, spaceId }) => {
    try {
      const data = await searchByDiamond(esClient.asCurrentUser, logger, spaceId, {
        vertex_queries: params.vertex_queries,
        source_report_id: params.source_report_id,
        size: params.size,
      });
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`search_by_diamond tool failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `search_by_diamond failed: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
