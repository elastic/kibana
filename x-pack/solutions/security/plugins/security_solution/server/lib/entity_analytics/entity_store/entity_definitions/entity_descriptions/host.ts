/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect, newestValue } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common';

export const HOST_DEFINITION_VERSION = '2.0.0';
// Runtime mapping field that computes the entity ID based on ranking system
// See: entity-store-docs/architecture/0003-entity-id-unique-identifier/HOST_ENTITY.md
export const HOST_IDENTITY_FIELD = '_computed_entity_id';

const HOST_ENTITY_TYPE = 'Host';
export const hostEntityEngineDescription: EntityDescription = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  identityField: HOST_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  settings: {
    timestampField: '@timestamp',
  },
  pipeline: [
    {
      set: {
        field: 'entity.type',
        value: HOST_ENTITY_TYPE,
        override: false,
      },
    },
  ],
  fields: [
    // Store single keyword values for display and querying (must come first to avoid array conversion)
    newestValue({ source: 'host.name' }),
    newestValue({ source: 'host.id' }),
    newestValue({ source: 'host.hostname' }),
    newestValue({ source: 'host.mac' }),
    newestValue({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    // Additional host fields
    collect({ source: 'host.domain' }),
    collect({
      source: 'host.os.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'host.os.type' }),
    collect({ source: 'host.type' }),
    collect({ source: 'host.architecture' }),
    ...getCommonFieldDescriptions('host'),
    ...getEntityFieldsDescriptions('host'),

    collect({
      source: `host.entity.relationships.Communicates_with`,
      destination: 'entity.relationships.Communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Depends_on`,
      destination: 'entity.relationships.Depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Dependent_of`,
      destination: 'entity.relationships.Dependent_of',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    collect({
      source: `host.entity.relationships.Owned_by`,
      destination: 'entity.relationships.Owned_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Accessed_frequently_by`,
      destination: 'entity.relationships.Accessed_frequently_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
  ],
};
