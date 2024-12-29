/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { InferSearchResponseOf } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import { ProfilingESField } from '@kbn/profiling-utils';
import type { StackFrameMetadata } from '@kbn/profiling-utils';
import { createUniformBucketsForTimeRange } from './histogram';

export const OTHER_BUCKET_LABEL = i18n.translate('xpack.profiling.topn.otherBucketLabel', {
  defaultMessage: 'Other',
});

export interface CountPerTime {
  Timestamp: number;
  Percentage: number;
  Count: number | null;
}

export interface TopNSample extends CountPerTime {
  Category: string;
  Percentage: number;
}

export interface TopNSamples {
  TopN: TopNSample[];
}

export interface TopNResponse extends TopNSamples {
  TotalCount: number;
  Metadata: Record<string, StackFrameMetadata[]>;
  Labels: Record<string, string>;
}

export interface TopNSamplesHistogramResponse {
  sum_other_doc_count: number;
  buckets: Array<{
    key: string | number;
    doc_count: number;
    count: { value: number | null };
    over_time: {
      buckets: Array<{ doc_count: number; key: string | number; count: { value: number | null } }>;
    };
  }>;
}

export function getTopNAggregationRequest({
  searchField,
  highCardinality,
  fixedInterval,
}: {
  searchField: string;
  highCardinality: boolean;
  fixedInterval: string;
}) {
  return {
    group_by: {
      terms: {
        field: searchField,
        order: { count: 'desc' as const },
        size: 99,
        execution_hint: highCardinality ? ('map' as const) : ('global_ordinals' as const),
      },
      aggs: {
        ...(searchField === ProfilingESField.HostID
          ? {
              sample: {
                top_metrics: {
                  metrics: [
                    { field: ProfilingESField.HostName },
                    { field: ProfilingESField.HostIP },
                  ] as [{ field: ProfilingESField.HostName }, { field: ProfilingESField.HostIP }],
                  sort: {
                    '@timestamp': 'desc' as const,
                  },
                },
              },
            }
          : {}),
        over_time: {
          date_histogram: {
            field: ProfilingESField.Timestamp,
            fixed_interval: fixedInterval,
          },
          aggs: {
            count: {
              sum: {
                field: ProfilingESField.StacktraceCount,
              },
            },
          },
        },
        count: {
          sum: {
            field: ProfilingESField.StacktraceCount,
          },
        },
      },
    },
    over_time: {
      date_histogram: {
        field: ProfilingESField.Timestamp,
        fixed_interval: fixedInterval,
      },
      aggs: {
        count: {
          sum: {
            field: ProfilingESField.StacktraceCount,
          },
        },
      },
    },
    total_count: {
      sum_bucket: {
        buckets_path: 'over_time>count',
      },
    },
  };
}

export function createTopNSamples(
  response: Required<
    InferSearchResponseOf<unknown, { body: { aggs: ReturnType<typeof getTopNAggregationRequest> } }>
  >['aggregations'],
  startMilliseconds: number,
  endMilliseconds: number,
  bucketWidth: number
): TopNSample[] {
  const bucketsByCategories = new Map();
  const uniqueTimestamps = new Set<number>();
  const groupByBuckets = response.group_by.buckets ?? [];

  // Keep track of the sum per timestamp to subtract it from the 'other' bucket
  const sumsOfKnownFieldsByTimestamp = new Map<number, number>();

  // Convert the buckets into nested maps and record the unique timestamps
  for (let i = 0; i < groupByBuckets.length; i++) {
    const frameCountsByTimestamp = new Map();
    const items = groupByBuckets[i].over_time.buckets;

    for (let j = 0; j < items.length; j++) {
      const timestamp = Number(items[j].key);
      const count = items[j].count.value ?? 0;
      uniqueTimestamps.add(timestamp);
      const sumAtTimestamp = (sumsOfKnownFieldsByTimestamp.get(timestamp) ?? 0) + count;
      sumsOfKnownFieldsByTimestamp.set(timestamp, sumAtTimestamp);
      frameCountsByTimestamp.set(timestamp, count);
    }
    bucketsByCategories.set(groupByBuckets[i].key, frameCountsByTimestamp);
  }

  // Create the 'other' bucket by subtracting the sum of all known buckets
  // from the total
  const otherFrameCountsByTimestamp = new Map<number, number>();

  const totalFrameCountsByTimestamp = new Map<number, number>();

  let addOtherBucket = false;

  for (let i = 0; i < response.over_time.buckets.length; i++) {
    const bucket = response.over_time.buckets[i];
    const timestamp = Number(bucket.key);
    const valueForOtherBucket =
      (bucket.count.value ?? 0) - (sumsOfKnownFieldsByTimestamp.get(timestamp) ?? 0);

    if (valueForOtherBucket > 0) {
      addOtherBucket = true;
    }

    otherFrameCountsByTimestamp.set(timestamp, valueForOtherBucket);

    totalFrameCountsByTimestamp.set(timestamp, bucket.count.value ?? 0);
  }

  // Only add the 'other' bucket if at least one value per timestamp is > 0
  if (addOtherBucket) {
    bucketsByCategories.set(OTHER_BUCKET_LABEL, otherFrameCountsByTimestamp);
  }

  // Fill in missing timestamps so that the entire time range is covered
  const timestamps = createUniformBucketsForTimeRange(
    [...uniqueTimestamps],
    startMilliseconds,
    endMilliseconds,
    bucketWidth
  );

  // Normalize samples so there are an equal number of data points per timestamp
  const samples: TopNSample[] = [];
  for (const category of bucketsByCategories.keys()) {
    const frameCountsByTimestamp = bucketsByCategories.get(category);
    for (const timestamp of timestamps) {
      const count = frameCountsByTimestamp.get(timestamp) ?? 0;
      const sample: TopNSample = {
        Timestamp: timestamp,
        Count: count,
        Category: category,
        Percentage: (count / totalFrameCountsByTimestamp.get(timestamp)!) * 100,
      };
      samples.push(sample);
    }
  }

  return orderBy(samples, ['Timestamp', 'Count', 'Category'], ['asc', 'desc', 'asc']);
}

export interface TopNSubchart {
  Category: string;
  Label: string;
  Percentage: number;
  Series: CountPerTime[];
  Color: string;
  Index: number;
  Metadata: StackFrameMetadata[];
}

export function getCategoryColor({
  category,
  subChartSize,
  colors,
}: {
  category: string;
  subChartSize: number;
  colors: ReturnType<typeof euiPaletteColorBlind>;
}) {
  // We want the mapping from the category string to the color to be constant,
  // so that the same category string will always map to the same color.
  const stringhash = (s: string): number => {
    let hash: number = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = (hash << 5) - hash + ch; // eslint-disable-line no-bitwise
      // Apply bit mask to ensure positive value.
      hash &= 0x7fffffff; // eslint-disable-line no-bitwise
    }
    return hash % subChartSize;
  };

  return colors[stringhash(category)];
}

export function groupSamplesByCategory(topNResponse: TopNResponse): { charts: TopNSubchart[] } {
  const {
    TotalCount: totalCount,
    TopN: samples,
    Metadata: metadata,
    Labels: labels,
  } = topNResponse;

  const seriesByCategory = new Map<string, CountPerTime[]>();

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];

    if (!seriesByCategory.has(sample.Category)) {
      seriesByCategory.set(sample.Category, []);
    }
    const series = seriesByCategory.get(sample.Category)!;
    series.push({
      Percentage: sample.Percentage,
      Timestamp: sample.Timestamp,
      Count: sample.Count,
    });
  }

  const subcharts: Array<Omit<TopNSubchart, 'Color' | 'Index'>> = [];

  for (const [category, series] of seriesByCategory) {
    const totalPerCategory = series.reduce((sumOf, { Count }) => sumOf + (Count ?? 0), 0);
    subcharts.push({
      Category: category,
      Label: labels[category] || category,
      Percentage: (totalPerCategory / totalCount) * 100,
      Series: series,
      Metadata: metadata[category] ?? [],
    });
  }

  const colors = euiPaletteColorBlind({
    rotations: Math.ceil(subcharts.length / 10),
  });

  return {
    charts: orderBy(subcharts, ['Percentage', 'Category'], ['desc', 'asc']).map((chart, index) => {
      return {
        ...chart,
        Color: getCategoryColor({
          category: chart.Category,
          colors,
          subChartSize: subcharts.length,
        }),
        Index: index + 1,
        Series: chart.Series.map((value) => {
          return {
            ...value,
            Category: chart.Category,
          };
        }),
      };
    }),
  };
}
