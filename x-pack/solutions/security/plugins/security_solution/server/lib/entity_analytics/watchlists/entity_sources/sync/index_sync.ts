/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { MonitoringEntitySourceDescriptorClient } from '../../../privilege_monitoring/saved_objects';
import { createSourcesSyncService } from './sources_sync';
import { createUpdateDetectionService } from './update_detection/update_detection';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = ({
  esClient,
  logger,
  targetIndex,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  targetIndex: string;
}) => {
  const updateDetectionService = createUpdateDetectionService({ esClient, logger, targetIndex });
  const sourcesSyncService = createSourcesSyncService({ logger });

  const plainIndexSync = async ({
    descriptorClient,
    sourceIds,
  }: {
    descriptorClient: MonitoringEntitySourceDescriptorClient;
    sourceIds: string[];
  }) => {
    await sourcesSyncService.syncBySourceIds({
      descriptorClient,
      sourceIds,
      process: async (source: MonitoringEntitySource) => {
        await updateDetectionService.updateDetection(source);
      },
    });
  };

  return { plainIndexSync };
};
