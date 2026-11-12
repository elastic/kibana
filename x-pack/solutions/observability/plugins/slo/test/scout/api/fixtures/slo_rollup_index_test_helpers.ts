/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsClient } from '@kbn/scout-oblt';
import {
  SLI_DESTINATION_INDEX_NAME,
  SLI_DESTINATION_INDEX_PATTERN,
} from '../../../../common/constants';
import { TEST_SPACE_ID } from './slo_test_data';

export interface SloRollupDoc {
  '@timestamp': string;
  spaceId: string;
  slo: {
    id: string;
    revision: number;
    instanceId: string;
    numerator: number;
    denominator: number;
    isGoodSlice: number;
  };
}

export function createRollupDoc({
  sloId,
  instanceId,
  timestamp,
  good,
  total,
}: {
  sloId: string;
  instanceId: string;
  timestamp: string;
  good: number;
  total: number;
}): SloRollupDoc {
  return {
    '@timestamp': timestamp,
    spaceId: TEST_SPACE_ID,
    slo: {
      id: sloId,
      revision: 1,
      instanceId,
      numerator: good,
      denominator: total,
      isGoodSlice: good / total >= 0.99 ? 1 : 0,
    },
  };
}

export async function insertSloRollupDocs(esClient: EsClient, docs: SloRollupDoc[]): Promise<void> {
  const operations = docs.flatMap((doc) => [
    { index: { _index: SLI_DESTINATION_INDEX_NAME } },
    doc,
  ]);
  await esClient.bulk({
    refresh: true,
    operations,
  });
}

export async function countSloRollupDocs(
  esClient: EsClient,
  filter?: QueryDslQueryContainer
): Promise<number> {
  const result = await esClient.count({
    index: SLI_DESTINATION_INDEX_PATTERN,
    query: filter,
  });
  return result.count;
}

export async function cleanupSloRollupDocs(esClient: EsClient, sloIds: string[]): Promise<void> {
  await esClient.deleteByQuery({
    index: SLI_DESTINATION_INDEX_PATTERN,
    query: { terms: { 'slo.id': sloIds } },
    refresh: true,
    conflicts: 'proceed',
  });
}
