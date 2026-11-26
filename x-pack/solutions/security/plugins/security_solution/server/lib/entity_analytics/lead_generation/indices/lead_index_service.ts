/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  getLeadsIndexName,
  getLegacyLeadsIndexNames,
} from '../../../../../common/entity_analytics/lead_generation';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { generateLeadIndexMappings } from './mappings';

export interface LeadIndexServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

/** Manages the lifecycle of the lead generation ES index per space. */
export const createLeadIndexService = ({ esClient, logger, spaceId }: LeadIndexServiceDeps) => {
  const indexName = getLeadsIndexName(spaceId);

  const createIndex = async (): Promise<void> => {
    const mappings = generateLeadIndexMappings();
    logger.info(`Creating or updating lead generation index: ${indexName}`);
    await createOrUpdateIndex({
      esClient,
      logger,
      options: {
        index: indexName,
        mappings,
        settings: { hidden: true, auto_expand_replicas: '0-1' },
      },
    });
  };

  const doesIndexExist = async (): Promise<boolean> => {
    try {
      return await esClient.indices.exists({ index: indexName });
    } catch (e) {
      logger.debug(`Error checking if lead index exists (${indexName}): ${e.message}`);
      return false;
    }
  };

  /** Deletes the current index and any legacy adhoc/scheduled indices left from before the single-index migration. */
  const deleteIndex = async (): Promise<void> => {
    const toDelete = [indexName, ...getLegacyLeadsIndexNames(spaceId)];
    for (const name of toDelete) {
      try {
        const exists = await esClient.indices.exists({ index: name });
        if (exists) {
          await esClient.indices.delete({ index: name });
          logger.info(`Deleted lead generation index: ${name}`);
        }
      } catch (e) {
        logger.error(`Failed to delete lead index ${name}: ${e.message}`);
      }
    }
  };

  return { createIndex, doesIndexExist, deleteIndex };
};

export type LeadIndexService = ReturnType<typeof createLeadIndexService>;
