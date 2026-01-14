/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointType } from '@kbn/es-types/src';

export interface ChangePointDetails {
  change_point?: number;
  r_value?: number;
  trend?: string;
  p_value?: number;
}

interface ChangePointResult {
  type: Record<ChangePointType, ChangePointDetails>;
  bucket?: {
    key: string | number;
    key_as_string?: string;
    doc_count: number;
  };
}

export interface Bucket {
  key: string | number | Array<string | number>;
  regex?: string;
  changes?: ChangePointResult;
  time_series: {
    buckets: Array<{
      key: string | number;
      key_as_string?: string;
      doc_count: number;
    }>;
  };
}

export interface ChangePoint {
  key: string | number | Array<string | number>;
  pattern?: string;
  timeSeries?: Array<{ x: number; y: number }>;
  summary: string;
  changes: ChangePointDetails & {
    time?: string;
    type: ChangePointType;
  };
}

function getSummary({
  changes,
  startTime,
  endTime,
}: {
  changes: ChangePoint['changes'];
  startTime: string;
  endTime: string;
}): string {
  switch (changes.type) {
    case 'spike':
      return `A significant spike (transient increase) was detected for the time range ${startTime} to ${endTime} at ${changes.time} (p_value: ${changes.p_value}).`;

    case 'dip':
      return `A significant dip (transient decrease) was detected for the time range ${startTime} to ${endTime} at ${changes.time} (p_value: ${changes.p_value}).`;

    case 'step_change':
      return `A step change (baseline shift) was detected for the time range ${startTime} to ${endTime} starting at ${changes.time} (p_value: ${changes.p_value}).`;

    case 'trend_change':
      return `A trend change (slope shift) was detected for the time range ${startTime} to ${endTime} starting at ${changes.time} (p_value: ${changes.p_value}).`;

    case 'stationary':
      return `No change points were found for the time range ${startTime} to ${endTime}. The data is stationary (stable).`;

    case 'non_stationary':
      return `No specific change point was found for the time range ${startTime} to ${endTime}, but the data is non-stationary (unstable). The values are drifting or volatile without a clear single trigger event.`;

    case 'indeterminable':
      return `No specific change point was found for the time range ${startTime} to ${endTime}, and the data is indeterminable. There is insufficient evidence to classify the data as stationary or non-stationary.`;

    default:
      return `An anomaly of type '${changes.type}' was detected for the time range ${startTime} to ${endTime} at ${changes.time}.`;
  }
}

function isChangePoint(changes: ChangePointResult): boolean {
  return !changes.type.stationary && !changes.type.indeterminable && !changes.type.non_stationary;
}

export async function getChangePoints({ buckets }: { buckets: Bucket[] }): Promise<ChangePoint[]> {
  const series = buckets
    .filter((bucket) => bucket.changes)
    .map((bucket) => {
      const changesResult = bucket.changes!;
      const [changeType, value] = Object.entries(changesResult.type)[0];
      const changes = {
        time: changesResult.bucket?.key
          ? new Date(changesResult.bucket.key).toISOString()
          : undefined,
        type: changeType as ChangePointType,
        ...value,
      };
      return {
        key: bucket.key,
        pattern: bucket.regex,
        summary: getSummary({
          changes,
          startTime: bucket.time_series.buckets[0]?.key_as_string ?? '',
          endTime:
            bucket.time_series.buckets[bucket.time_series.buckets.length - 1]?.key_as_string ?? '',
        }),
        timeSeries: isChangePoint(bucket.changes!)
          ? bucket.time_series.buckets.map((group) => ({
              x: new Date(group.key).getTime(),
              y: group.doc_count,
            }))
          : undefined,
        changes,
      };
    });

  return series;
}
