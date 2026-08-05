/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

type CreateResolutionClient = (
  client: ElasticsearchClient,
  namespace: string
) => {
  getResolutionGroup: (entityId: string) => Promise<{ target: Record<string, unknown> }>;
};

/**
 * Returns the resolution target's `entity.id` (V2 EUID), or undefined when
 * the target document does not carry one. Supports nested and flat-keyed
 * latest-entities `_source` shapes.
 */
export const getResolutionTargetEntityId = (
  target: Record<string, unknown>
): string | undefined => {
  if (typeof target['entity.id'] === 'string' && target['entity.id'].length > 0) {
    return target['entity.id'];
  }
  const entity = target.entity as { id?: unknown } | undefined;
  if (typeof entity?.id === 'string' && entity.id.length > 0) {
    return entity.id;
  }
  return undefined;
};

/**
 * Given any member (or target) entity id, looks up its resolution group and
 * returns the target's `entity.id`. Falls back to `entityStoreId` when the
 * resolution client is unavailable or the lookup fails.
 */
export const resolveResolutionTargetEntityId = async ({
  entityStoreId,
  spaceId,
  esClient,
  createResolutionClient,
  logger,
}: {
  entityStoreId: string;
  spaceId: string;
  esClient: ElasticsearchClient;
  createResolutionClient?: CreateResolutionClient;
  logger: Logger;
}): Promise<string> => {
  if (!createResolutionClient) {
    return entityStoreId;
  }

  try {
    const group = await createResolutionClient(esClient, spaceId).getResolutionGroup(entityStoreId);
    return getResolutionTargetEntityId(group.target) ?? entityStoreId;
  } catch (error) {
    logger.debug(
      `Failed to resolve resolution-group target for ${entityStoreId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return entityStoreId;
  }
};
