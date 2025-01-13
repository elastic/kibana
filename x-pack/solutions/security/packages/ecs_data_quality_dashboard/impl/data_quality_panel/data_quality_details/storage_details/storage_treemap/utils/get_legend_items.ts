/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { orderBy } from 'lodash/fp';

import { PatternRollup } from '../../../../types';
import { FlattenedBucket, LegendItem } from '../../types';
import { getFillColor } from './get_fill_color';
import { getPatternDocsCount, getPatternSizeInBytes } from './stats';

export const getLegendItemsForPattern = ({
  pattern,
  flattenedBuckets,
  successColor,
  dangerColor,
  primaryColor,
}: {
  pattern: string;
  flattenedBuckets: FlattenedBucket[];
  successColor: string;
  dangerColor: string;
  primaryColor: string;
}): LegendItem[] =>
  orderBy(
    ['sizeInBytes'],
    ['desc'],
    flattenedBuckets
      .filter((x) => x.pattern === pattern)
      .map((flattenedBucket) => ({
        color: getFillColor(flattenedBucket.incompatible, successColor, dangerColor, primaryColor),
        ilmPhase: flattenedBucket.ilmPhase ?? null,
        index: flattenedBucket.indexName ?? null,
        pattern: flattenedBucket.pattern,
        sizeInBytes: flattenedBucket.sizeInBytes,
        docsCount: flattenedBucket.docsCount,
      }))
  );

export const getPatternLegendItem = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): LegendItem => ({
  color: null,
  ilmPhase: null,
  index: null,
  pattern,
  sizeInBytes: getPatternSizeInBytes({ pattern, patternRollups }),
  docsCount: getPatternDocsCount({ pattern, patternRollups }),
});

export const getLegendItems = ({
  patterns,
  flattenedBuckets,
  patternRollups,
  successColor,
  dangerColor,
  primaryColor,
}: {
  patterns: string[];
  flattenedBuckets: FlattenedBucket[];
  patternRollups: Record<string, PatternRollup>;
  successColor: string;
  dangerColor: string;
  primaryColor: string;
}): LegendItem[] =>
  patterns.reduce<LegendItem[]>(
    (acc, pattern) => [
      ...acc,
      getPatternLegendItem({ pattern, patternRollups }),
      ...getLegendItemsForPattern({
        pattern,
        flattenedBuckets,
        successColor,
        dangerColor,
        primaryColor,
      }),
    ],
    []
  );
