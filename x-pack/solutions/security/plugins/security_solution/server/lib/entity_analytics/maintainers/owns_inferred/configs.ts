/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';

export const OWNS_INFERRED_INTEGRATION_RELATIONSHIP_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    kind: 'standard',
    id: 'elastic_defend_ai_agent',
    name: 'Elastic Defend AI agents',
    indexPattern: (ns) => `logs-endpoint.events.*-${ns}`,
    relationshipKey: 'owns_inferred',
    targetEntityType: 'ai_agent',
    // The target gate is the ai_agent documents filter, so only the agent's own events count. A
    // descendant run under `sudo` carries another OS user and must not make that user an owner.
    requireTargetEntityIdExists: true,
    // The agent EUID embeds `user.name` and `host.id`, so its runner is the host-scoped user
    // `user:<user.name>@<host.id>@local` on every Defend document.
    customActor: { fields: ['user.name'] },
    hostScopedUsersOnly: true,
    esqlWhereClause: `process.ai_agent.name IS NOT NULL`,
    compositeAggAdditionalFilters: [{ exists: { field: 'process.ai_agent.name' } }],
  },
];
