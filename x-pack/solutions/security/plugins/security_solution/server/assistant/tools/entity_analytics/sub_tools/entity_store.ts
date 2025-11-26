/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesIndexName } from '../../../../lib/entity_analytics/entity_store/utils';
import { ENGINE_STATUS } from '../../../../lib/entity_analytics/entity_store/constants';
import { EngineDescriptorClient } from '../../../../lib/entity_analytics/entity_store/saved_object/engine_descriptor';
import type { EntityType } from '../../../../../common/search_strategy';
import type { EntityAnalyticsSubTool } from './types';

export const getEntityStoreSubTool: EntityAnalyticsSubTool = async (
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
      message: `
        This is a set of rules that you must follow strictly:
        * Use the latest entity store index pattern: ${getEntitiesIndexName(
          entityType,
          spaceId
        )} when answering questions about the current entity store of entities. It has only one entry per entity. You **MUST NOT** run aggregations/STATS queries on it for data about one entity on this index.
        * When searching the entity store for '${entityType}' you **MUST ALWAYS** filter by: 'where entity.EngineMetadata.Type == "${entityType}" OR entity.type == "${entityType}"'.
        * Do not use the following field entity.behaviors and entity.relationships to answer questions about the entity store.`,
      index: getEntitiesIndexName(entityType, spaceId),
      // TODO: for when historical index is implemented: Use the history index pattern: ${getEntitiesSnapshotIndexPattern(entityType, spaceId)} when answering questions about historical data.
    };
  } else {
    return {
      message: `
        The entity store for entity type '${entityType}' is not enabled in this environment. The current status is: ${
        engine?.status ?? 'NOT CONFIGURED'
      }. The user needs to enable the entity store for this entity type so this assistant can answer related questions.`,
    };
  }
};
