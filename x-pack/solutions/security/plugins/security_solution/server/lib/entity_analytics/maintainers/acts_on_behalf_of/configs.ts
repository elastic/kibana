/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common/domain/entity_index';
import type { RelationshipIntegrationConfig } from '../engine/types';
import { buildRawIdentifiersExistenceGate } from '../engine/build_raw_identifiers_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';

const RELATIONSHIP_KEY = 'acts_on_behalf_of';
const RAW_EMAIL_FIELD = `entity.relationships.${RELATIONSHIP_KEY}.raw_identifiers.user.email`;

/**
 * Step 2 ES|QL: resolves each agent's account emails to the user rows that carry that
 * `user.email`, and replaces a row resolved into another (`resolution.resolved_to`) by its
 * target, so one person in two IdPs yields one ID.
 *
 * The actor is the agent's own `entity.id`. Only the actor columns are kept before the join,
 * because the lookup overwrites every column it shares with the entity index.
 */
export function buildActsOnBehalfOfEsqlQuery(namespace: string): string {
  const entityIndex = getEntitiesAlias(ENTITY_LATEST, namespace);

  return `FROM ${entityIndex}
| WHERE entity.EngineMetadata.Type == "ai_agent" AND ${RAW_EMAIL_FIELD} IS NOT NULL
| EVAL ${ENGINE_COLUMNS.actor} = entity.id, user.email = ${RAW_EMAIL_FIELD}
| KEEP ${ENGINE_COLUMNS.actor}, user.email
| MV_EXPAND user.email
| LOOKUP JOIN ${entityIndex} ON user.email
| WHERE entity.EngineMetadata.Type == "user"
| EVAL targetEntityId = COALESCE(entity.relationships.resolution.resolved_to, entity.id)
| WHERE COALESCE(targetEntityId, "") != ""
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

export const ACTS_ON_BEHALF_OF_INTEGRATION_RELATIONSHIP_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    kind: 'override',
    id: 'ai_agent_account_email',
    name: 'AI agent account emails',
    indexPattern: (namespace) => getEntitiesAlias(ENTITY_LATEST, namespace),
    targetEntityType: 'user',
    relationshipKey: RELATIONSHIP_KEY,
    customActor: { fields: ['entity.id'] },
    // Entity-index source: the log-index lookback would drop agents not re-extracted recently.
    // Every run rescans all agents, because a user row appearing or a resolution change alters
    // the result without touching the agent row.
    disableLookbackWindow: true,
    // `resolution.resolved_to` names an entity by ID only, so check it exists before writing.
    validateTargetIds: true,
    compositeAggAdditionalFilters: [
      { term: { 'entity.EngineMetadata.Type': 'ai_agent' } },
      buildRawIdentifiersExistenceGate({ relationshipKey: RELATIONSHIP_KEY, fields: ['user.email'] }),
    ],
    esqlQueryOverride: buildActsOnBehalfOfEsqlQuery,
  },
];
