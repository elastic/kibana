/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect, newestValue } from './field_retention_operations';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';

/**
 * Generic entity: no host.* or user.* (those belong to host/user definitions only).
 * Entity, asset, cloud, orchestrator, and relationship fields only.
 */
export const genericEntityDefinition: EntityDefinitionWithoutId = {
  type: 'generic',
  name: `Security 'generic' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['entity.id'],
    euidFields: [[{ field: 'entity.id' }]],
  },
  indexPatterns: [],
  fields: [
    newestValue({ source: 'entity.name' }),
    ...getEntityFieldsDescriptions(),

    newestValue({ source: 'cloud.account.id' }),
    newestValue({ source: 'cloud.account.name' }),
    newestValue({ source: 'cloud.availability_zone' }),
    newestValue({ source: 'cloud.instance.id' }),
    newestValue({ source: 'cloud.instance.name' }),
    newestValue({ source: 'cloud.machine.type' }),
    newestValue({ source: 'cloud.project.id' }),
    newestValue({ source: 'cloud.project.name' }),
    newestValue({ source: 'cloud.provider' }),
    newestValue({ source: 'cloud.region' }),
    newestValue({ source: 'cloud.service.name' }),

    newestValue({ source: 'orchestrator.api_version' }),
    newestValue({ source: 'orchestrator.cluster.id' }),
    newestValue({ source: 'orchestrator.cluster.name' }),
    newestValue({ source: 'orchestrator.cluster.url' }),
    newestValue({ source: 'orchestrator.cluster.version' }),
    newestValue({ source: 'orchestrator.namespace' }),
    newestValue({ source: 'orchestrator.organization' }),
    newestValue({ source: 'orchestrator.resource.annotation' }),
    newestValue({ source: 'orchestrator.resource.id' }),
    newestValue({ source: 'orchestrator.resource.ip' }),
    newestValue({ source: 'orchestrator.resource.label' }),
    newestValue({ source: 'orchestrator.resource.name' }),
    newestValue({ source: 'orchestrator.resource.parent.type' }),
    newestValue({ source: 'orchestrator.resource.type' }),
    newestValue({ source: 'orchestrator.type' }),

    ...getCommonFieldDescriptions('entity'),

    /* Generic definition: relationship types (snake_case, keyword array) */
    collect({
      source: 'entity.relationships.Accesses_frequently',
      destination: 'entity.relationships.accesses_frequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'entity.relationships.Communicates_with',
      destination: 'entity.relationships.communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'entity.relationships.Depends_on',
      destination: 'entity.relationships.depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'entity.relationships.Owns',
      destination: 'entity.relationships.owns',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'entity.relationships.Resolved_to',
      destination: 'entity.relationships.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    /* Mapping only: populated by maintainers */
    newestValue({
      source: 'entity.relationships.owns_inferred',
      destination: 'entity.relationships.owns_inferred',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.accesses_infrequently',
      destination: 'entity.relationships.accesses_infrequently',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.resolved_to',
      destination: 'entity.relationships.resolution.resolved_to',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_level',
      destination: 'entity.relationships.resolution.risk.calculated_level',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_score',
      destination: 'entity.relationships.resolution.risk.calculated_score',
      mapping: { type: 'float' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_score_norm',
      destination: 'entity.relationships.resolution.risk.calculated_score_norm',
      mapping: { type: 'float' },
    }),
  ],
} as const satisfies EntityDefinitionWithoutId;
