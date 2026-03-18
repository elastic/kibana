/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_PREVIEW_RULE_TOOL_ID = securityTool('preview_rule');

const previewRuleSchema = z.object({
  rule_type: z
    .enum(['eql', 'esql', 'query', 'threshold'])
    .describe('The type of detection rule to preview'),
  query: z
    .string()
    .describe(
      'The detection query to test. Must be valid syntax for the selected rule_type (ES|QL, EQL, or KQL).'
    ),
  index_patterns: z
    .array(z.string())
    .describe('Index patterns to search against, e.g. ["logs-endpoint.events.*"]'),
  language: z
    .enum(['eql', 'esql', 'kuery', 'lucene'])
    .optional()
    .describe('Query language. Defaults based on rule_type: eql->eql, esql->esql, query->kuery.'),
  time_range: z
    .string()
    .default('1h')
    .describe('How far back to look, e.g. "1h", "24h", "7d". Defaults to 1h.'),
  invocation_count: z
    .number()
    .min(1)
    .max(24)
    .default(1)
    .describe('Number of rule invocations to simulate. Higher values cover more time.'),
  threshold_field: z
    .string()
    .optional()
    .describe('For threshold rules: the field to group by for counting.'),
  threshold_value: z
    .number()
    .optional()
    .describe('For threshold rules: the minimum count to trigger an alert.'),
});

export const previewRuleTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures?: ExperimentalFeatures
): BuiltinSkillBoundedTool<typeof previewRuleSchema> => {
  return {
    id: SECURITY_PREVIEW_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Preview/test a detection rule query without creating it. Shows how many alerts the rule would generate and sample matches. Use this to validate rule queries before deployment.',
    schema: previewRuleSchema,
    handler: async (
      {
        rule_type: ruleType,
        query,
        index_patterns: indexPatterns,
        language,
        time_range: timeRange,
        invocation_count: _invocationCount,
        threshold_field: thresholdField,
        threshold_value: thresholdValue,
      },
      { esClient }
    ) => {
      logger.debug(
        `${SECURITY_PREVIEW_RULE_TOOL_ID} tool called with type: ${ruleType}, query length: ${query.length}`
      );

      try {
        const resolvedLanguage =
          language ?? (ruleType === 'eql' ? 'eql' : ruleType === 'esql' ? 'esql' : 'kuery');

        const timeFilter = {
          range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } },
        };

        if (resolvedLanguage === 'esql') {
          const result = await esClient.asCurrentUser.esql.query({
            query,
            format: 'json',
          });
          const columns = (result as unknown as Record<string, unknown>).columns as
            | Array<{ name: string }>
            | undefined;
          const values = (result as unknown as Record<string, unknown>).values as
            | unknown[][]
            | undefined;
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  match_count: values?.length ?? 0,
                  columns: columns?.map((c) => c.name) ?? [],
                  sample_results: values?.slice(0, 10) ?? [],
                  message: `ES|QL query returned ${values?.length ?? 0} result(s).`,
                },
              },
            ],
          };
        }

        if (resolvedLanguage === 'eql') {
          const eqlResult = await esClient.asCurrentUser.eql.search({
            index: indexPatterns.join(','),
            query,
            size: 10,
            filter: timeFilter,
          });
          const hits = eqlResult.hits?.events ?? eqlResult.hits?.sequences ?? [];
          const sampleResults = hits.slice(0, 10).map((h) => {
            if ('_source' in h) {
              return h._source ?? h;
            }
            return h;
          });
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  match_count: hits.length,
                  sample_results: sampleResults,
                  message: `EQL query matched ${hits.length} event(s) in the last ${timeRange}.`,
                },
              },
            ],
          };
        }

        if (ruleType === 'threshold' && thresholdField) {
          const thresholdResult = await esClient.asCurrentUser.search({
            index: indexPatterns.join(','),
            size: 0,
            query: {
              bool: {
                must: [{ query_string: { query, default_operator: 'AND' } }, timeFilter],
              },
            },
            aggs: {
              threshold_groups: {
                terms: { field: thresholdField, size: 20 },
              },
            },
          });

          const aggs = thresholdResult.aggregations as Record<string, unknown> | undefined;
          const buckets =
            (aggs?.threshold_groups as { buckets?: Array<{ key: string; doc_count: number }> })
              ?.buckets ?? [];
          const threshold = thresholdValue ?? 1;
          const triggeringBuckets = buckets.filter((b) => b.doc_count >= threshold);

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  threshold_field: thresholdField,
                  threshold_value: threshold,
                  total_groups: buckets.length,
                  triggering_groups: triggeringBuckets.length,
                  top_groups: triggeringBuckets.slice(0, 10).map((b) => ({
                    key: b.key,
                    count: b.doc_count,
                  })),
                  message: `Threshold query: ${triggeringBuckets.length} of ${buckets.length} group(s) exceed threshold of ${threshold} in the last ${timeRange}.`,
                },
              },
            ],
          };
        }

        const searchResult = await esClient.asCurrentUser.search({
          index: indexPatterns.join(','),
          size: 10,
          query: {
            bool: {
              must: [{ query_string: { query, default_operator: 'AND' } }, timeFilter],
            },
          },
        });

        const totalHits =
          typeof searchResult.hits.total === 'number'
            ? searchResult.hits.total
            : searchResult.hits.total?.value ?? 0;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: totalHits,
                sample_results: searchResult.hits.hits.slice(0, 10).map((h) => ({
                  _id: h._id,
                  ...(h._source as Record<string, unknown>),
                })),
                message: `Query matched ${totalHits} document(s) in the last ${timeRange}.`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_PREVIEW_RULE_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error previewing rule: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
