/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  LogExplorationHistogram,
  LogExplorationRefinement,
} from '../../../common/log_exploration';
import { MAX_HISTOGRAM_BUCKETS } from '../../../common/log_exploration';
import { parseDatemath } from '../../utils/time';
import { assertSafeFieldName, assertSafeIndexPattern, pickBucketInterval } from '../../utils/esql';
import { buildRefinementFilter } from '../../utils/log_exploration_refinements';

interface Epoch {
  startMs: number;
  endMs: number;
}

async function getBucketedCounts({
  esClient,
  index,
  filter,
  epoch,
  intervalLiteral,
  intervalMs,
}: {
  esClient: IScopedClusterClient;
  index: string;
  filter?: QueryDslQueryContainer;
  epoch: Epoch;
  intervalLiteral: string;
  intervalMs: number;
}): Promise<number[]> {
  const query = [
    `FROM ${assertSafeIndexPattern(index)}`,
    `| WHERE @timestamp >= ?tstart AND @timestamp < ?tend`,
    `| STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${intervalLiteral})`,
    `| SORT bucket ASC`,
    `| LIMIT ${MAX_HISTOGRAM_BUCKETS}`,
  ].join('\n');

  const response = await esClient.asCurrentUser.esql.query({
    query,
    params: [
      { tstart: new Date(epoch.startMs).toISOString() },
      { tend: new Date(epoch.endMs).toISOString() },
    ],
    ...(filter ? { filter } : {}),
  });

  const columns = response.columns ?? [];
  const countIdx = columns.findIndex((column) => column.name === 'count');
  const bucketIdx = columns.findIndex((column) => column.name === 'bucket');

  const bucketCount = Math.min(
    Math.ceil((epoch.endMs - epoch.startMs) / intervalMs),
    MAX_HISTOGRAM_BUCKETS
  );
  const series = new Array<number>(bucketCount).fill(0);

  if (countIdx === -1 || bucketIdx === -1) {
    return series;
  }

  for (const row of response.values ?? []) {
    const bucketStart = new Date(String(row[bucketIdx])).valueOf();
    if (Number.isNaN(bucketStart)) {
      continue;
    }
    // Index by offset from the epoch start so both epochs share one x axis.
    const offset = Math.floor((bucketStart - epoch.startMs) / intervalMs);
    if (offset >= 0 && offset < bucketCount) {
      series[offset] = Number(row[countIdx] ?? 0);
    }
  }

  return series;
}

export async function getLogVolumeComparison({
  esClient,
  index,
  messageField,
  refinements = [],
  start,
  end,
  baselineStart,
  baselineEnd,
}: {
  esClient: IScopedClusterClient;
  index: string;
  messageField: string;
  refinements?: LogExplorationRefinement[];
  start: string;
  end: string;
  baselineStart: string;
  baselineEnd: string;
}): Promise<LogExplorationHistogram> {
  const current: Epoch = {
    startMs: parseDatemath(start),
    endMs: parseDatemath(end, { roundUp: true }),
  };
  const baseline: Epoch = {
    startMs: parseDatemath(baselineStart),
    endMs: parseDatemath(baselineEnd, { roundUp: true }),
  };

  // One interval for both epochs, otherwise the two series cannot be overlaid.
  const interval = pickBucketInterval(current.endMs - current.startMs, MAX_HISTOGRAM_BUCKETS - 12);

  // Both epochs carry the same refinements, so the comparison stays like-for-like.
  const filter = buildRefinementFilter({
    refinements,
    messageField: assertSafeFieldName(messageField),
  });

  const [currentSeries, baselineSeries] = await Promise.all([
    getBucketedCounts({
      esClient,
      index,
      filter,
      epoch: current,
      intervalLiteral: interval.literal,
      intervalMs: interval.ms,
    }),
    getBucketedCounts({
      esClient,
      index,
      filter,
      epoch: baseline,
      intervalLiteral: interval.literal,
      intervalMs: interval.ms,
    }),
  ]);

  return {
    intervalMs: interval.ms,
    startMs: current.startMs,
    baselineStartMs: baseline.startMs,
    current: currentSeries,
    baseline: baselineSeries,
  };
}
