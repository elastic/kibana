/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  SEARCH_REPORTS_API_PATH,
  SEVERITY_LEVELS,
  SOURCE_TYPES,
  THREAT_CATEGORIES,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REGIONS,
} from '../../../../common/threat_intelligence/hub';
import { searchReports } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `search_reports` domain action.
 *
 * Per the Agent Builder architecture guidance, the canonical execution
 * surface is the internal HTTP route at `SEARCH_REPORTS_API_PATH` and the
 * orchestrating agent should prefer `execute_workflow_step` with
 * `kibana-request` against that route. This tool is retained only as a
 * portability surface for 3rd party agents (Claude, Cursor) that can't
 * reach Kibana APIs natively — it delegates to the same shared service
 * the route uses, so the two paths can never drift.
 */
const searchReportsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Free-text query. Searched semantically against `content.title` and `content.body_text` ' +
        'and lexically against the BM25 mirror fields. Combined via RRF.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of reports to return.'),
  source_types: z
    .array(z.enum(SOURCE_TYPES))
    .optional()
    .describe('Restrict to a subset of source types (e.g. ["rss", "vendor_api"]).'),
  min_severity: z
    .enum(SEVERITY_LEVELS)
    .optional()
    .describe('Minimum severity level to include. Filters out reports below this threshold.'),
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .optional()
    .describe('Restrict to reports ingested in this time window.'),
  categories: z
    .array(z.enum(THREAT_CATEGORIES))
    .optional()
    .describe(
      'Restrict to reports whose closed-set categories overlap any of the given values ' +
        '(e.g. ["ransomware", "supply-chain"]). Categories are populated by the stage-2 ' +
        'enrichment in the `nl_extraction_behavioral` workflow.'
    ),
  regions: z
    .array(z.enum(THREAT_REGIONS))
    .optional()
    .describe(
      'Restrict to reports tagged with any of the given macro geographic regions ' +
        '(e.g. ["north-america", "europe"]). Backed by `geography.regions` on the report.'
    ),
});

export const searchReportsTool: BuiltinSkillBoundedTool<typeof searchReportsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.searchReports,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${SEARCH_REPORTS_API_PATH}. ` +
    'Semantic + BM25 hybrid search over the `.kibana-threat-reports-*` data stream. Returns the top ' +
    'matching threat intelligence reports across all sources (RSS feeds, STIX/TAXII, vendor ' +
    'APIs, analyst-pasted documents). Use when the user asks about threats, advisories, ' +
    'CVEs in the wild, threat actors, or wants a digest of recent intel matching a topic. ' +
    'Inside Kibana, prefer calling the route directly via `execute_workflow_step` + `kibana-request`.',
  schema: searchReportsSchema,
  handler: async (params, { esClient, logger, spaceId }) => {
    try {
      const data = await searchReports(esClient.asCurrentUser, logger, spaceId, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`search_reports failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `Failed to search threat reports: ${(err as Error).message}. ` +
                `If the error mentions inference, the cluster may be missing a default ` +
                `text_embedding endpoint — see the plugin README for setup.`,
            },
          },
        ],
      };
    }
  },
};
