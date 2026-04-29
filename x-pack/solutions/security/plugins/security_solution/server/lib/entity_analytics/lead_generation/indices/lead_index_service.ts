/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  getLeadsIndexName,
  type LeadGenerationMode,
} from '../../../../../common/entity_analytics/lead_generation';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { generateLeadIndexMappings } from './mappings';

const LEAD_INDEX_MODES: readonly LeadGenerationMode[] = ['adhoc', 'scheduled'] as const;

export interface LeadIndexServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

/**
 * Manages the lifecycle of lead generation ES indices (one adhoc + one scheduled per space).
 */
export const createLeadIndexService = ({ esClient, logger, spaceId }: LeadIndexServiceDeps) => {
  const getIndices = () =>
    LEAD_INDEX_MODES.map((mode) => ({ name: getLeadsIndexName(spaceId, mode), mode }));

  /** Idempotent: creates or updates mappings for both indices. */
  const createIndices = async (): Promise<void> => {
    const mappings = generateLeadIndexMappings();

    for (const { name, mode } of getIndices()) {
      logger.info(`Creating or updating lead generation index: ${name} (mode: ${mode})`);
      await createOrUpdateIndex({
        esClient,
        logger,
        options: {
          index: name,
          mappings,
          settings: { hidden: true },
        },
      });
    }
  };

  const doesIndexExist = async (mode: LeadGenerationMode = 'adhoc'): Promise<boolean> => {
    const indexName = getLeadsIndexName(spaceId, mode);
    try {
      return await esClient.indices.exists({ index: indexName });
    } catch (e) {
      logger.debug(`Error checking if lead index exists (${indexName}): ${e.message}`);
      return false;
    }
  };

  /** Deletes both indices. Used during cleanup / feature disable. */
  const deleteIndices = async (): Promise<void> => {
    for (const { name } of getIndices()) {
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

  return { createIndices, doesIndexExist, deleteIndices };
};

export type LeadIndexService = ReturnType<typeof createLeadIndexService>;
