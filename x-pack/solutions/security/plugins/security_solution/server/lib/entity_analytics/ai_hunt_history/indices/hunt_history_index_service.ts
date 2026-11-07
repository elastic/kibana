/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getAiHuntHistoryIndexName } from '../../../../../common/entity_analytics/ai_hunt_history/constants';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { generateHuntHistoryIndexMappings } from './mappings';

export interface HuntHistoryIndexServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

/**
 * Manages the lifecycle of the per-space AI Hunt history index. The index is
 * created lazily (idempotently) the first time a hunt is saved.
 */
export const createHuntHistoryIndexService = ({
  esClient,
  logger,
  spaceId,
}: HuntHistoryIndexServiceDeps) => {
  const indexName = getAiHuntHistoryIndexName(spaceId);

  /** Idempotent: creates or updates mappings for the space index. */
  const createIndexIfMissing = async (): Promise<void> => {
    await createOrUpdateIndex({
      esClient,
      logger,
      options: {
        index: indexName,
        mappings: generateHuntHistoryIndexMappings(),
        settings: { hidden: true },
      },
    });
  };

  return { indexName, createIndexIfMissing };
};

export type HuntHistoryIndexService = ReturnType<typeof createHuntHistoryIndexService>;
