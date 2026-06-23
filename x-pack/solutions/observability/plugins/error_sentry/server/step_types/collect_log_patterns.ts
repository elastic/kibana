/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { estypes } from '@elastic/elasticsearch';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { collectLogPatternsCommonDefinition } from '../../common/step_types/collect_log_patterns';

// OTel uses severity_text; ECS uses log.level / log.level.keyword
const LOG_LEVEL_FIELDS = ['severity_text', 'log.level.keyword', 'log.level'] as const;

const occurrenceLevelForCount = (docCount: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (docCount >= 10000) return 'critical';
  if (docCount >= 1000) return 'high';
  if (docCount >= 100) return 'medium';
  return 'low';
};

interface CategorizeTextBucket {
  key: string;
  doc_count: number;
  sample?: {
    hits?: {
      hits?: Array<{ _source?: Record<string, unknown> }>;
    };
  };
}

export const collectLogPatternsStepDefinition = createServerStepDefinition({
  ...collectLogPatternsCommonDefinition,
  handler: async (context) => {
    const {
      index,
      lookbackDays,
      categoryField,
      timestampField,
      minDocCount,
      size,
      logLevels,
      samplingProbability,
    } = context.input;
    const esClient = context.contextManager.getScopedEsClient();

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: `now-${lookbackDays}d`, lte: 'now' } } },
    ];

    if (logLevels && logLevels.length > 0) {
      filter.push({
        bool: {
          minimum_should_match: 1,
          should: LOG_LEVEL_FIELDS.map((field) => ({ terms: { [field]: logLevels } })),
        },
      });
    }

    const categorizeAgg: estypes.AggregationsAggregationContainer = {
      categorize_text: { field: categoryField, size },
      aggs: {
        sample: { top_hits: { size: 1, _source: { includes: [categoryField] } } },
      },
    };

    const aggs: Record<string, estypes.AggregationsAggregationContainer> =
      samplingProbability != null
        ? {
            sampled: {
              random_sampler: { probability: samplingProbability },
              aggs: { patterns: categorizeAgg },
            },
          }
        : { patterns: categorizeAgg };

    const response = await esClient.search(
      {
        index,
        size: 0,
        track_total_hits: false,
        query: { bool: { filter } },
        aggs,
      },
      { signal: context.abortSignal }
    );

    const aggregations = response.aggregations as
      | {
          patterns?: { buckets?: CategorizeTextBucket[] };
          sampled?: { patterns?: { buckets?: CategorizeTextBucket[] } };
        }
      | undefined;

    const buckets =
      (samplingProbability != null
        ? aggregations?.sampled?.patterns?.buckets
        : aggregations?.patterns?.buckets) ?? [];

    const patterns = buckets
      .map((bucket) => {
        const source = bucket.sample?.hits?.hits?.[0]?._source;
        const sampleMessage = source?.[categoryField];
        const key = String(bucket.key);
        return {
          key,
          hash: createHash('sha256').update(key).digest('hex').slice(0, 12),
          docCount: bucket.doc_count,
          occurrenceLevel: occurrenceLevelForCount(bucket.doc_count),
          sampleMessage: typeof sampleMessage === 'string' ? sampleMessage : undefined,
        };
      })
      .filter((pattern) => pattern.docCount >= minDocCount);

    context.logger.debug(
      `error-sentry.collectLogPatterns: found ${patterns.length} pattern(s) in ${index}`
    );

    return { output: { total: patterns.length, patterns } };
  },
});
