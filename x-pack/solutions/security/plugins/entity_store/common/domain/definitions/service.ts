/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { compose, field } from './euid_instructions';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const serviceEntityDefinition: EntityDefinitionWithoutId = {
  type: 'service',
  name: `Security 'service' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['service.entity.id', 'service.name'],
    euidFields: [compose(field('service.entity.id')), compose(field('service.name'))],
  },
  indexPatterns: [],
  entityTypeFallback: 'Service',
  fields: [
    newestValue({ destination: 'entity.name', source: 'service.name' }),
    oldestValue({ source: 'service.entity.id' }),

    collect({ source: 'service.name' }),
    collect({ source: 'service.address' }),
    collect({ source: 'service.environment' }),
    collect({ source: 'service.ephemeral_id' }),
    collect({ source: 'service.id' }),
    collect({ source: 'service.node.name' }),
    collect({ source: 'service.node.roles' }),
    collect({ source: 'service.node.role' }),
    newestValue({ source: 'service.state' }),
    collect({ source: 'service.type' }),
    newestValue({ source: 'service.version' }),
    ...getCommonFieldDescriptions('service'),
    ...getEntityFieldsDescriptions('service'),
  ],
} as const satisfies EntityDefinitionWithoutId;
