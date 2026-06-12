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
  SEARCH_BY_ANCHORS_API_PATH,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { searchByAnchors } from '../../../threat_intelligence/services';

/**
 * Portability wrapper around POST {@link SEARCH_BY_ANCHORS_API_PATH}.
 *
 * Exact-anchor correlation search — finds reports that share discriminating
 * hash IOCs, ioc_set_hash, or threat actor names with the query case.
 * Gated on `.correlate` privilege at the HTTP route; this tool runs in-process.
 */
const anchorIocSchema = z.object({
  type: z.string().describe('IOC type: hash, ip, domain, url, email, etc.'),
  value: z.string().describe('Raw IOC value (e.g. a SHA-256 hash or domain name).'),
});

const searchByAnchorsSchema = z.object({
  source_report_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Elasticsearch _id of a stored threat report. The service fetches its extracted anchor ' +
        'fields (hash IOCs, ioc_set_hash, actors) and searches for reports that share them. ' +
        'Mutually exclusive with `anchors`.'
    ),
  anchors: z
    .object({
      iocs: z.array(anchorIocSchema).optional().describe('Explicit IOC list to match against.'),
      ioc_set_hash: z
        .string()
        .optional()
        .describe('Fingerprint hash of the full IOC set for exact-match dedup.'),
      actors: z
        .array(z.string())
        .optional()
        .describe('Named threat actor strings to match against `extracted.threat_actors`.'),
      technique_ids: z
        .array(z.string())
        .optional()
        .describe('MITRE ATT&CK technique IDs (e.g. "T1059") for boost-only matching.'),
    })
    .optional()
    .describe('Explicit anchor set. Provide either `anchors` or `source_report_id`, not both.'),
  size: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe('Maximum hits to return (1–50, default 20).'),
});

export const searchByAnchorsTool: BuiltinToolDefinition<typeof searchByAnchorsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.searchByAnchors,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${SEARCH_BY_ANCHORS_API_PATH}. ` +
    'Exact-anchor correlation search: finds stored threat reports that share discriminating ' +
    'hash IOCs, an exact ioc_set_hash fingerprint, or named threat actors with the query case. ' +
    'Use when you have specific hash IOCs or a known report_id and want to find related reports. ' +
    'Returns match_breakdown per hit so you can see which anchors fired. ' +
    'Complement with `search_by_diamond` (semantic) for full coverage — ' +
    '`correlate_threat` runs both in parallel.',
  schema: searchByAnchorsSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async (params, { esClient, logger, spaceId }) => {
    try {
      const data = await searchByAnchors(esClient.asCurrentUser, logger, spaceId, {
        anchors: params.anchors,
        source_report_id: params.source_report_id,
        size: params.size,
      });
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`search_by_anchors tool failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `search_by_anchors failed: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
