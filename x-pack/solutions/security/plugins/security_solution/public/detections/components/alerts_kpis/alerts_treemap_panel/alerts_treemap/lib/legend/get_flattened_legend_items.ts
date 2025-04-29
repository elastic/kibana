/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstNonNullValue } from '../../../../../../../../common/endpoint/models/ecs_safety_helpers';
import type { LegendItem } from '../../../../../../../common/components/charts/draggable_legend_item';
import { getLegendMap, getLegendItemFromFlattenedBucket } from '.';
import type { FlattenedBucket, RawBucket } from '../../types';

export const getFlattenedLegendItems = ({
  buckets,
  colorPalette,
  flattenedBuckets,
  maxRiskSubAggregations,
  stackByField0,
  stackByField1,
}: {
  buckets: RawBucket[];
  colorPalette: string[];
  flattenedBuckets: FlattenedBucket[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
  stackByField1: string | undefined;
}): LegendItem[] => {
  // create a map of bucket.key -> LegendItem[] from the raw buckets:
  const legendMap: Record<string, LegendItem[]> = getLegendMap({
    buckets,
    colorPalette,
    maxRiskSubAggregations,
    stackByField0,
  });

  // append each flattened bucket to the appropriate parent in the legendMap:
  const combinedLegendItems: Record<string, LegendItem[]> = flattenedBuckets.reduce<
    Record<string, LegendItem[]>
  >(
    (acc, flattenedBucket) => ({
      ...acc,
      [firstNonNullValue(flattenedBucket.key) ?? '']: [
        ...(acc[firstNonNullValue(flattenedBucket.key) ?? ''] ?? []),
        getLegendItemFromFlattenedBucket({
          colorPalette,
          flattenedBucket,
          maxRiskSubAggregations,
          stackByField0,
          stackByField1,
        }),
      ],
    }),
    legendMap
  );

  // reduce all the legend items to a single array in the same order as the raw buckets:
  return buckets.reduce<LegendItem[]>(
    (acc, bucket) => [...acc, ...combinedLegendItems[firstNonNullValue(bucket.key) ?? '']],
    []
  );
};
