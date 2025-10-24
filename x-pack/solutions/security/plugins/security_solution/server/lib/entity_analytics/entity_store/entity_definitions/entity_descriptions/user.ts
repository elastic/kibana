/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common';
import { collectValues as collect, newestValue } from './field_utils';

export const USER_DEFINITION_VERSION = '2.0.0';
// Runtime mapping field that computes the entity ID based on ranking system
// See: entity-store-docs/architecture/0003-entity-id-unique-identifier/USER_ENTITY.md
export const USER_IDENTITY_FIELD = '_computed_entity_id';

const USER_ENTITY_TYPE = 'Identity';

export const userEntityEngineDescription: EntityDescription = {
  entityType: 'user',
  version: USER_DEFINITION_VERSION,
  identityField: USER_IDENTITY_FIELD,
  identityFieldMapping: {
    type: 'keyword',
    fields: {
      text: {
        type: 'match_only_text',
      },
    },
  },
  settings: {
    timestampField: '@timestamp',
  },
  pipeline: [
    {
      set: {
        field: 'entity.type',
        value: USER_ENTITY_TYPE,
        override: false,
      },
    },
  ],
  fields: [
    // Store single keyword values for display and querying (must come first to avoid array conversion)
    newestValue({ source: 'user.name' }),
    newestValue({ source: 'user.id' }),
    newestValue({ source: 'user.email' }),
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
    // Additional user fields
    collect({ source: 'user.domain' }),
    collect({
      source: 'user.full_name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'user.hash' }),
    collect({ source: 'user.roles' }),
    ...getCommonFieldDescriptions('user'),
    ...getEntityFieldsDescriptions('user'),

    collect({
      source: `user.entity.relationships.Accesses_frequently`,
      destination: 'entity.relationships.Accesses_frequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `user.entity.relationships.Owns`,
      destination: 'entity.relationships.Owns',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    collect({
      source: `user.entity.relationships.Supervises`,
      destination: 'entity.relationships.Supervises',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `user.entity.relationships.Supervised_by`,
      destination: 'entity.relationships.Supervised_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
  ],
};
