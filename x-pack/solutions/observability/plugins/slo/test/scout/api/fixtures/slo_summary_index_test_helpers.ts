/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsClient } from '@kbn/scout-oblt';
import { SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/constants';

export async function insertSloSummaryDocs(esClient: EsClient, docs: unknown[]): Promise<void> {
  const operations = docs.flatMap((doc) => [
    { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
    doc,
  ]);
  await esClient.bulk({
    refresh: 'wait_for',
    operations,
  });
}

export async function cleanupSloSummaryDocs(esClient: EsClient): Promise<void> {
  await esClient.deleteByQuery({
    index: SUMMARY_DESTINATION_INDEX_NAME,
    query: { match_all: {} },
    refresh: true,
    conflicts: 'proceed',
  });
}

export async function countSloSummaryDocs(
  esClient: EsClient,
  filter?: QueryDslQueryContainer
): Promise<number> {
  const result = await esClient.count({
    index: SUMMARY_DESTINATION_INDEX_NAME,
    query: filter,
  });
  return result.count;
}

export async function refreshSloSummaryIndex(esClient: EsClient): Promise<void> {
  await esClient.indices.refresh({
    index: SUMMARY_DESTINATION_INDEX_NAME,
  });
}
