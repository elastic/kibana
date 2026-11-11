/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { IDataStreamClient } from '@kbn/core-data-streams-server';
import type { FeatureUpsert, StreamQuery } from '@kbn/significant-events-schema';
import type { knowledgeIndicatorsMappings } from '../data_stream';
import type { StoredKnowledgeIndicator } from '../data_stream';
import type { KnowledgeIndicatorType } from '../fields';
import type { SearchEmbeddingModelResolver } from './search_embedding_model';

export type RuleUnbackedFilter = 'exclude' | 'include' | 'only';

export type KnowledgeIndicatorDataStreamClient = IDataStreamClient<
  typeof knowledgeIndicatorsMappings,
  StoredKnowledgeIndicator & Record<string, unknown>
>;

interface KIBulkIndexFeatureOperation {
  index: { feature: FeatureUpsert };
}
interface KIBulkIndexQueryOperation {
  index: { query: StreamQuery & { rule_backed?: boolean; rule_id?: string } };
}
interface KIBulkDeleteOperation {
  delete: { type: KnowledgeIndicatorType; id: string };
}
interface KIBulkExcludeOperation {
  exclude: { id: string };
}
interface KIBulkRestoreOperation {
  restore: { id: string };
}
/** Re-indexes a feature with no `expires_at` (durable) or a fresh TTL (expiring). */
interface KIBulkDurabilityOperation {
  durability: { id: string; durable: boolean };
}
export type KIBulkOperation =
  | KIBulkIndexFeatureOperation
  | KIBulkIndexQueryOperation
  | KIBulkDeleteOperation
  | KIBulkExcludeOperation
  | KIBulkRestoreOperation
  | KIBulkDurabilityOperation;

export interface KnowledgeIndicatorClientDeps {
  dataStreamClient: KnowledgeIndicatorDataStreamClient;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  /** Kibana space every read is filtered by and every write is stamped with. */
  space: string;
  /** Test seam for the `search_embedding` model lookup. */
  searchEmbeddingModelResolver?: SearchEmbeddingModelResolver;
  /**
   * Serializes final source writes with query invalidation. `allowDisabled` marks writes that only
   * remove knowledge, which a disabled source still accepts. `waitForLease: false` fails at once
   * when another write holds the lease; the default waits.
   */
  withSourceWrite?: <T>(
    sourceId: string,
    run: () => Promise<T>,
    options?: { allowDisabled?: boolean; waitForLease?: boolean }
  ) => Promise<T>;
}
