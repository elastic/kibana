/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getAlertVectorIndexName } from '../types';
import { createOrUpdateIndex } from '../../entity_analytics/utils/create_or_update_index';
import { generateAlertVectorIndexMappings } from './mappings';
import type { AlertVectorDocument } from '../types';

export interface AlertVectorIndexServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

export const createAlertVectorIndexService = ({
  esClient,
  logger,
  spaceId,
}: AlertVectorIndexServiceDeps) => {
  const indexName = getAlertVectorIndexName(spaceId);

  const createIndex = async (): Promise<void> => {
    logger.info(`Creating or updating alert vector index: ${indexName}`);
    await createOrUpdateIndex({
      esClient,
      logger,
      options: {
        index: indexName,
        mappings: generateAlertVectorIndexMappings(),
        settings: { hidden: true },
      },
    });
  };

  const doesIndexExist = async (): Promise<boolean> => {
    try {
      return await esClient.indices.exists({ index: indexName });
    } catch (e) {
      logger.debug(`Error checking if alert vector index exists (${indexName}): ${e.message}`);
      return false;
    }
  };

  const deleteIndex = async (): Promise<void> => {
    try {
      const exists = await esClient.indices.exists({ index: indexName });
      if (exists) {
        await esClient.indices.delete({ index: indexName });
        logger.info(`Deleted alert vector index: ${indexName}`);
      }
    } catch (e) {
      logger.error(`Failed to delete alert vector index ${indexName}: ${e.message}`);
    }
  };

  const storeVectorDocument = async (doc: AlertVectorDocument): Promise<string> => {
    const response = await esClient.index({
      index: indexName,
      document: doc,
      refresh: 'wait_for',
    });
    return response._id;
  };

  const bulkStoreVectorDocuments = async (docs: AlertVectorDocument[]): Promise<string[]> => {
    if (docs.length === 0) return [];

    const operations = docs.flatMap((doc) => [{ index: { _index: indexName } }, doc]);
    const response = await esClient.bulk({ operations, refresh: 'wait_for' });

    if (response.errors) {
      const failedItems = response.items.filter((item) => item.index?.error);
      logger.error(
        `Bulk store had ${failedItems.length} failures: ${JSON.stringify(
          failedItems.map((item) => item.index?.error?.reason)
        )}`
      );
    }

    return response.items
      .filter((item) => !item.index?.error && item.index?._id != null)
      .map((item) => item.index?._id ?? '');
  };

  const findByAlertId = async (alertId: string): Promise<AlertVectorDocument | undefined> => {
    const response = await esClient.search<AlertVectorDocument>({
      index: indexName,
      query: { term: { alert_id: alertId } },
      size: 1,
    });
    const hit = response.hits.hits[0];
    return hit?._source ?? undefined;
  };

  const findByFeatureHash = async (
    featureHash: string
  ): Promise<AlertVectorDocument | undefined> => {
    const response = await esClient.search<AlertVectorDocument>({
      index: indexName,
      query: { term: { feature_text_hash: featureHash } },
      size: 1,
    });
    const hit = response.hits.hits[0];
    return hit?._source ?? undefined;
  };

  return {
    createIndex,
    doesIndexExist,
    deleteIndex,
    storeVectorDocument,
    bulkStoreVectorDocuments,
    findByAlertId,
    findByFeatureHash,
    getIndexName: () => indexName,
  };
};

export type AlertVectorIndexService = ReturnType<typeof createAlertVectorIndexService>;
