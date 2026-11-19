/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EVALUATION_COLUMNS } from '../lib/build_query';

export type EvaluationValues = [
  instanceId: string,
  windowIndex: number,
  shortWindowBurnRate: number,
  longWindowBurnRate: number
];

export interface GroupingsHit {
  instanceId: string;
  groupings?: Record<string, unknown>;
}

export const createEvaluationResponse = (
  values: EvaluationValues[]
): estypes.EsqlQueryResponse => ({
  columns: [
    { name: EVALUATION_COLUMNS.instanceId, type: 'keyword' },
    { name: EVALUATION_COLUMNS.windowIndex, type: 'integer' },
    { name: EVALUATION_COLUMNS.shortWindowBurnRate, type: 'double' },
    { name: EVALUATION_COLUMNS.longWindowBurnRate, type: 'double' },
  ],
  values,
});

export const createGroupingsResponse = (hits: GroupingsHit[]): estypes.SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: hits.map(({ instanceId, groupings }) => ({
      _index: '.slo-observability.sli-v3',
      _id: instanceId,
      _source: { slo: { instanceId, groupings } },
    })),
  },
});
