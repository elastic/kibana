/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlIsNotNullOrEmpty } from '../logs_extraction/esql_strings';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const serviceEntityDefinition: EntityDefinitionWithoutId = {
  type: 'service',
  name: `Security 'service' Entity Store Definition`,
  identityField: {
    calculated: true,
    defaultIdField: 'service.entity.id',
    defaultIdFieldMapping: { type: 'keyword' },
    typeToAppendToGeneratedId: 'service',
    requiresOneOfFields: ['service.name'],

    /*
      Implements the following rank
      1. service.entity.id    --> implemented as the default id field
      2. service.name
    */
    esqlEvaluation: `CASE(${esqlIsNotNullOrEmpty('service.name')}, service.name, NULL)`,
  },
  indexPatterns: [],
  entityTypeFallback: 'Service',
  fields: [
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

    collect({
      source: `service.entity.relationships.Communicates_with`,
      destination: 'entity.relationships.Communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `service.entity.relationships.Depends_on`,
      destination: 'entity.relationships.Depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `service.entity.relationships.Dependent_of`,
      destination: 'entity.relationships.Dependent_of',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
  ],
};
