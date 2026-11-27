/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common/constants';

export { type EuidSourceFields } from '@kbn/cloud-security-posture-common/constants';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';

export const GRAPH_ACTOR_EUID_SOURCE_FIELDS = getGraphActorEuidSourceFields({
  euid,
  getBuiltInEntityDefinition,
});
export const GRAPH_TARGET_EUID_SOURCE_FIELDS = getGraphTargetEuidSourceFields({
  euid,
  getBuiltInEntityDefinition,
});

/**
 * Entity type prefixes that carry an explicit `<type>:` EUID prefix.
 * Anything not starting with one of these is treated as a generic entity.
 */
export const TYPED_ENTITY_PREFIXES = ['user', 'host', 'service', 'ai_agent'] as const;

/**
 * Typed entity types the events graph resolves from event fields. Agents are drawn from Entity
 * Store rows only: event actors always carry `user.name`, which ranks first, and no event has
 * agent target fields.
 */
export const EVENT_TYPED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

/**
 * ES|QL FORK supports a maximum of 8 branches. buildRelationshipsEsqlQuery emits one FORK
 * branch per relationship field, so ENTITY_RELATIONSHIP_FIELDS is batched into groups of at
 * most this size, each issued as its own ES|QL query, once it exceeds the limit.
 */
export const RELATIONSHIP_FIELDS_FORK_BATCH_SIZE = 8;
