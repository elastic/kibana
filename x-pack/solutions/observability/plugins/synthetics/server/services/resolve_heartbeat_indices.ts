/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { isCCSEnabled } from '../lib/remote_result_utils';
import type { SyntheticsServerSetup } from '../types';
import { getSyntheticsIndices } from './get_synthetics_indices';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from './synthetics_multi_space_settings_repository';

export interface ResolveHeartbeatIndicesArgs {
  server: SyntheticsServerSetup;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}

/**
 * Resolves the heartbeat index pattern, cached per space. Falls back to the
 * local pattern when CCS is disabled or resolution fails. See issue #273625
 * for the lazy-`getHeartbeatIndices()` follow-up.
 */
export const resolveHeartbeatIndices = async ({
  server,
  spaceId,
  savedObjectsClient,
  esClient,
}: ResolveHeartbeatIndicesArgs): Promise<string> => {
  if (!isCCSEnabled(server)) {
    return SYNTHETICS_INDEX_PATTERN;
  }

  try {
    return await server.syntheticsIndicesCache.get(spaceId, async () => {
      const repository = new DefaultSyntheticsMultiSpaceSettingsRepository(savedObjectsClient);
      const settings = await repository.get();
      const { indices } = await getSyntheticsIndices(esClient, {
        useAllRemoteClusters: settings.useAllRemoteClusters ?? false,
        selectedRemoteClusters: settings.selectedRemoteClusters ?? [],
      });
      return indices;
    });
  } catch (e) {
    server.logger.warn(`Failed to resolve CCS indices, falling back to local: ${e.message}`);
    return SYNTHETICS_INDEX_PATTERN;
  }
};
