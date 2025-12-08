/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointType } from '@kbn/es-types/src';

interface ChangePointDetails {
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
  };
}

export interface Bucket {
  key: string | number | Array<string | number>;
  regex?: string;
  changes?: ChangePointResult;
  over_time: {
    buckets: Array<{
      key: string | number;
      key_as_string?: string;
      doc_count: number;
    }>;
  };
}

export interface ChangePoint {
  name: string;
  key: string | number | Array<string | number>;
  pattern?: string;
  over_time: Array<{ x: number; y: number }>;
  changes: ChangePointDetails & {
    time: string;
    type: ChangePointType;
  };
}

export async function getChangePoints({
  name,
  buckets,
}: {
  name: string;
  buckets: Bucket[];
}): Promise<ChangePoint[]> {
  const series = buckets
    .filter(
      // filter out indeterminable changes
      (bucket) => bucket.changes && !bucket.changes.type?.indeterminable
    )
    .map((bucket) => {
      const changes = bucket.changes!;
      const [changeType, value] = Object.entries(changes.type)[0];
      return {
        name,
        key: bucket.key,
        pattern: bucket.regex,
        over_time: bucket.over_time.buckets.map((group) => ({
          x: new Date(group.key).getTime(),
          y: group.doc_count,
        })),
        changes: {
          time: changes.bucket?.key ? new Date(changes.bucket.key).toISOString() : '',
          type: changeType as ChangePointType,
          ...value,
        },
      };
    });

  return series;
}
