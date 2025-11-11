/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENGINE_STATUS } from '../../../../lib/entity_analytics/entity_store/constants';
import { EngineDescriptorClient } from '../../../../lib/entity_analytics/entity_store/saved_object/engine_descriptor';
import type { EntityType } from '../../../../../common/search_strategy';
import type { EntityAnalyticsSubPlugin } from './types';

const getEntityStoreIndexPattern = (entityType: EntityType, spaceId: string) =>
  `.entities.v1.latest.security_${entityType}_${spaceId}`;

export const getEntityStoreSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { spaceId, soClient }
) => {
  const engineClient = new EngineDescriptorClient({
    soClient,
    namespace: spaceId,
  });

  const engine = await engineClient.maybeGet(entityType);

  if (engine?.status === ENGINE_STATUS.STARTED) {
    return {
      message: `This is a set of rules that you must follow strictly:
  * When searching the entity store for '${entityType}' you **MUST ALWAYS** filter by: 'where entity.EngineMetadata.Type == "${entityType}" OR entity.type == "${entityType}"'.
  `,
      index: getEntityStoreIndexPattern(entityType, spaceId),
    };
  } else {
    return {
      message: `The entity store for entity type '${entityType}' is not enabled in this environment. The current status is: ${
        engine?.status ?? 'NOT CONFIGURED'
      }. The user needs to enable the entity store for this entity type so this assistant can answer related questions.`,
    };
  }
};
