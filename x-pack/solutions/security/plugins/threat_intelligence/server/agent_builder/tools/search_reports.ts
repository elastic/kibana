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
  SEVERITY_LEVELS,
  SOURCE_TYPES,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common';

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
});

const SEVERITY_RANK: Record<(typeof SEVERITY_LEVELS)[number], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const buildSeverityFilter = (
  minSeverity?: (typeof SEVERITY_LEVELS)[number]
): Array<Record<string, unknown>> => {
  if (!minSeverity) return [];
  const allowed = SEVERITY_LEVELS.filter(
    (level) => SEVERITY_RANK[level] >= SEVERITY_RANK[minSeverity]
  );
  return [{ terms: { 'severity.level': allowed } }];
};

export const searchReportsTool: BuiltinSkillBoundedTool<typeof searchReportsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.searchReports,
  type: ToolType.builtin,
  description:
    'Semantic + BM25 hybrid search over the `threat-reports-*` data stream. Returns the top ' +
    'matching threat intelligence reports across all sources (RSS feeds, STIX/TAXII, vendor ' +
    'APIs, analyst-pasted documents). Use when the user asks about threats, advisories, ' +
    'CVEs in the wild, threat actors, or wants a digest of recent intel matching a topic.',
  schema: searchReportsSchema,
  handler: async (
    { query, size, source_types: sourceTypes, min_severity: minSeverity, time_range: timeRange },
    { esClient, logger }
  ) => {
    const filters: Array<Record<string, unknown>> = [];
    if (sourceTypes?.length) filters.push({ terms: { 'source.type': sourceTypes } });
    if (timeRange) {
      filters.push({ range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } });
    }
    filters.push(...buildSeverityFilter(minSeverity));

    const sharedFilter = filters.length ? { bool: { filter: filters } } : undefined;

    try {
      // RRF retriever combines a BM25 multi_match against the mirror fields with a
      // semantic retriever against the semantic_text fields. RRF degrades gracefully
      // if inference is unavailable — BM25 hits still surface.
      const response = await esClient.asCurrentUser.search({
        index: THREAT_REPORTS_INDEX_PATTERN,
        size,
        _source: [
          '@timestamp',
          'source',
          'content.title',
          'severity',
          'extracted.ttps.techniques',
          'extracted.threat_actors',
          'content_fingerprint',
        ],
        retriever: {
          rrf: {
            rank_window_size: Math.max(size * 4, 50),
            rank_constant: 60,
            retrievers: [
              {
                standard: {
                  query: {
                    bool: {
                      must: [
                        {
                          multi_match: {
                            query,
                            fields: ['content.title_bm25^2', 'content.body_text_bm25'],
                          },
                        },
                      ],
                      ...(sharedFilter ? { filter: sharedFilter.bool.filter } : {}),
                    },
                  },
                },
              },
              {
                standard: {
                  query: {
                    bool: {
                      should: [
                        { semantic: { field: 'content.title', query } },
                        { semantic: { field: 'content.body_text', query } },
                      ],
                      minimum_should_match: 1,
                      ...(sharedFilter ? { filter: sharedFilter.bool.filter } : {}),
                    },
                  },
                },
              },
            ],
          },
        },
      } as Parameters<typeof esClient.asCurrentUser.search>[0]);

      const hits = (response.hits.hits ?? []).map((hit) => ({
        report_id: hit._id,
        score: hit._score,
        ...(hit._source as Record<string, unknown>),
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total:
                typeof response.hits.total === 'number'
                  ? response.hits.total
                  : response.hits.total?.value ?? hits.length,
              reports: hits,
            },
          },
        ],
      };
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
