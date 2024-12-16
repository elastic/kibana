/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { calculateAuto } from '@kbn/calculate-auto';
import {
  type RandomSamplerWrapper,
  createRandomSamplerWrapper,
} from '@kbn/ml-random-sampler-utils';
import { z } from '@kbn/zod';

const isoTimestampFormat = "YYYY-MM-DD'T'HH:mm:ss.SSS'Z'";

export interface LogCategory {
  change: LogCategoryChange;
  documentCount: number;
  histogram: LogCategoryHistogramBucket[];
  terms: string;
}

export type LogCategoryChange =
  | LogCategoryNoChange
  | LogCategoryRareChange
  | LogCategorySpikeChange
  | LogCategoryDipChange
  | LogCategoryStepChange
  | LogCategoryDistributionChange
  | LogCategoryTrendChange
  | LogCategoryOtherChange
  | LogCategoryUnknownChange;

export interface LogCategoryNoChange {
  type: 'none';
}

export interface LogCategoryRareChange {
  type: 'rare';
  timestamp: string;
}

export interface LogCategorySpikeChange {
  type: 'spike';
  timestamp: string;
}

export interface LogCategoryDipChange {
  type: 'dip';
  timestamp: string;
}

export interface LogCategoryStepChange {
  type: 'step';
  timestamp: string;
}

export interface LogCategoryTrendChange {
  type: 'trend';
  timestamp: string;
  correlationCoefficient: number;
}

export interface LogCategoryDistributionChange {
  type: 'distribution';
  timestamp: string;
}

export interface LogCategoryOtherChange {
  type: 'other';
  timestamp?: string;
}

export interface LogCategoryUnknownChange {
  type: 'unknown';
  rawChange: string;
}

export interface LogCategoryHistogramBucket {
  documentCount: number;
  timestamp: string;
}

export interface LogCategorizationParams {
  documentFilters: QueryDslQueryContainer[];
  endTimestamp: string;
  index: string;
  messageField: string;
  startTimestamp: string;
  timeField: string;
}

// the fraction of a category's histogram below which the category is considered rare
const rarityThreshold = 0.2;

export const categorizeDocuments = async ({
  esClient,
  index,
  endTimestamp,
  startTimestamp,
  timeField,
  messageField,
  samplingProbability,
  ignoredCategoryTerms,
  documentFilters = [],
  minDocsPerCategory,
}: {
  esClient: ElasticsearchClient;
  index: string;
  endTimestamp: string;
  startTimestamp: string;
  timeField: string;
  messageField: string;
  samplingProbability: number;
  ignoredCategoryTerms: string[];
  documentFilters?: QueryDslQueryContainer[];
  minDocsPerCategory?: number;
}) => {
  const randomSampler = createRandomSamplerWrapper({
    probability: samplingProbability,
    seed: 1,
  });

  const requestParams = createCategorizationRequestParams({
    index,
    timeField,
    messageField,
    startTimestamp,
    endTimestamp,
    randomSampler,
    additionalFilters: documentFilters,
    ignoredCategoryTerms,
    minDocsPerCategory,
    maxCategoriesCount: 1000,
  });

  const rawResponse = await esClient.search(requestParams);

  if (rawResponse.aggregations == null) {
    throw new Error('No aggregations found in large categories response');
  }

  const logCategoriesAggResult = randomSampler.unwrap(rawResponse.aggregations);

  if (!('categories' in logCategoriesAggResult)) {
    throw new Error('No categorization aggregation found in large categories response');
  }

  const logCategories =
    (logCategoriesAggResult.categories.buckets as unknown[]).map(mapCategoryBucket) ?? [];

  return {
    categories: logCategories,
    hasReachedLimit: logCategories.length >= 1000,
  };
};

const mapCategoryBucket = (bucket: any): LogCategory =>
  esCategoryBucketSchema
    .transform((parsedBucket) => ({
      change: mapChangePoint(parsedBucket),
      documentCount: parsedBucket.doc_count,
      histogram: parsedBucket.histogram,
      terms: parsedBucket.key,
    }))
    .parse(bucket);

const mapChangePoint = ({ change, histogram }: EsCategoryBucket): LogCategoryChange => {
  switch (change.type) {
    case 'stationary':
      if (isRareInHistogram(histogram)) {
        return {
          type: 'rare',
          timestamp: findFirstNonZeroBucket(histogram)?.timestamp ?? histogram[0].timestamp,
        };
      } else {
        return {
          type: 'none',
        };
      }
    case 'dip':
    case 'spike':
      return {
        type: change.type,
        timestamp: change.bucket.key,
      };
    case 'step_change':
      return {
        type: 'step',
        timestamp: change.bucket.key,
      };
    case 'distribution_change':
      return {
        type: 'distribution',
        timestamp: change.bucket.key,
      };
    case 'trend_change':
      return {
        type: 'trend',
        timestamp: change.bucket.key,
        correlationCoefficient: change.details.r_value,
      };
    case 'unknown':
      return {
        type: 'unknown',
        rawChange: change.rawChange,
      };
    case 'non_stationary':
    default:
      return {
        type: 'other',
      };
  }
};

/**
 * The official types are lacking the change_point aggregation
 */
const esChangePointBucketSchema = z.object({
  key: z.string().datetime(),
  doc_count: z.number(),
});

const esChangePointDetailsSchema = z.object({
  p_value: z.number(),
});

const esChangePointCorrelationSchema = esChangePointDetailsSchema.extend({
  r_value: z.number(),
});

const esChangePointSchema = z.union([
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        dip: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { dip: details } }) => ({
      type: 'dip' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        spike: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { spike: details } }) => ({
      type: 'spike' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        step_change: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { step_change: details } }) => ({
      type: 'step_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        trend_change: esChangePointCorrelationSchema,
      }),
    })
    .transform(({ bucket, type: { trend_change: details } }) => ({
      type: 'trend_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        distribution_change: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { distribution_change: details } }) => ({
      type: 'distribution_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      type: z.object({
        non_stationary: esChangePointCorrelationSchema.extend({
          trend: z.enum(['increasing', 'decreasing']),
        }),
      }),
    })
    .transform(({ type: { non_stationary: details } }) => ({
      type: 'non_stationary' as const,
      details,
    })),
  z
    .object({
      type: z.object({
        stationary: z.object({}),
      }),
    })
    .transform(() => ({ type: 'stationary' as const })),
  z
    .object({
      type: z.object({}),
    })
    .transform((value) => ({ type: 'unknown' as const, rawChange: JSON.stringify(value) })),
]);

const esHistogramSchema = z
  .object({
    buckets: z.array(
      z
        .object({
          key_as_string: z.string(),
          doc_count: z.number(),
        })
        .transform((bucket) => ({
          timestamp: bucket.key_as_string,
          documentCount: bucket.doc_count,
        }))
    ),
  })
  .transform(({ buckets }) => buckets);

type EsHistogram = z.output<typeof esHistogramSchema>;

const esCategoryBucketSchema = z.object({
  key: z.string(),
  doc_count: z.number(),
  change: esChangePointSchema,
  histogram: esHistogramSchema,
});

type EsCategoryBucket = z.output<typeof esCategoryBucketSchema>;

const isRareInHistogram = (histogram: EsHistogram): boolean =>
  histogram.filter((bucket) => bucket.documentCount > 0).length <
  histogram.length * rarityThreshold;

const findFirstNonZeroBucket = (histogram: EsHistogram) =>
  histogram.find((bucket) => bucket.documentCount > 0);

export const createCategorizationRequestParams = ({
  index,
  timeField,
  messageField,
  startTimestamp,
  endTimestamp,
  randomSampler,
  minDocsPerCategory = 0,
  additionalFilters = [],
  ignoredCategoryTerms = [],
  maxCategoriesCount = 1000,
}: {
  startTimestamp: string;
  endTimestamp: string;
  index: string;
  timeField: string;
  messageField: string;
  randomSampler: RandomSamplerWrapper;
  minDocsPerCategory?: number;
  additionalFilters?: QueryDslQueryContainer[];
  ignoredCategoryTerms?: string[];
  maxCategoriesCount?: number;
}) => {
  const startMoment = moment(startTimestamp, isoTimestampFormat);
  const endMoment = moment(endTimestamp, isoTimestampFormat);
  const fixedIntervalDuration = calculateAuto.atLeast(
    24,
    moment.duration(endMoment.diff(startMoment))
  );
  const fixedIntervalSize = `${Math.ceil(fixedIntervalDuration?.asMinutes() ?? 1)}m`;

  return {
    index,
    size: 0,
    track_total_hits: false,
    query: createCategorizationQuery({
      messageField,
      timeField,
      startTimestamp,
      endTimestamp,
      additionalFilters,
      ignoredCategoryTerms,
    }),
    aggs: randomSampler.wrap({
      histogram: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: fixedIntervalSize,
          extended_bounds: {
            min: startTimestamp,
            max: endTimestamp,
          },
        },
      },
      categories: {
        categorize_text: {
          field: messageField,
          size: maxCategoriesCount,
          categorization_analyzer: {
            tokenizer: 'standard',
          },
          ...(minDocsPerCategory > 0 ? { min_doc_count: minDocsPerCategory } : {}),
        },
        aggs: {
          histogram: {
            date_histogram: {
              field: timeField,
              fixed_interval: fixedIntervalSize,
              extended_bounds: {
                min: startTimestamp,
                max: endTimestamp,
              },
            },
          },
          change: {
            // @ts-expect-error the official types don't support the change_point aggregation
            change_point: {
              buckets_path: 'histogram>_count',
            },
          },
        },
      },
    }),
  };
};

export const createCategoryQuery =
  (messageField: string) =>
  (categoryTerms: string): QueryDslQueryContainer => ({
    match: {
      [messageField]: {
        query: categoryTerms,
        operator: 'AND' as const,
        fuzziness: 0,
        auto_generate_synonyms_phrase_query: false,
      },
    },
  });

export const createCategorizationQuery = ({
  messageField,
  timeField,
  startTimestamp,
  endTimestamp,
  additionalFilters = [],
  ignoredCategoryTerms = [],
}: {
  messageField: string;
  timeField: string;
  startTimestamp: string;
  endTimestamp: string;
  additionalFilters?: QueryDslQueryContainer[];
  ignoredCategoryTerms?: string[];
}): QueryDslQueryContainer => {
  return {
    bool: {
      filter: [
        {
          exists: {
            field: messageField,
          },
        },
        {
          range: {
            [timeField]: {
              gte: startTimestamp,
              lte: endTimestamp,
              format: 'strict_date_time',
            },
          },
        },
        ...additionalFilters,
      ],
      must_not: ignoredCategoryTerms.map(createCategoryQuery(messageField)),
    },
  };
};
