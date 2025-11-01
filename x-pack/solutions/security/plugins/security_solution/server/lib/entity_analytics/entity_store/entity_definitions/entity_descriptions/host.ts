/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect } from './field_utils';
import type { EntityDescription } from '../types';
import {
  CALCULATED_IDENTITY_FIELD,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
} from './common';

export const HOST_DEFINITION_VERSION = '1.0.0';

const HOST_ENTITY_TYPE = 'Host';
export const hostEntityEngineDescription: EntityDescription = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  identityField: CALCULATED_IDENTITY_FIELD,
  calculatedIdentity: {
    filterOnAtLeastOneOf: ['host.entity.id', 'host.name'],
    script: `
      def entityId = doc.containsKey('host.entity.id') && doc['host.entity.id'].size() > 0 ? doc['host.entity.id'].value : null;
      def hostName = doc.containsKey('host.name') && doc['host.name'].size() > 0 ? doc['host.name'].value : null;
      if (entityId != null && !entityId.isEmpty()) {
        emit(entityId);
      } else if (hostName != null && !hostName.isEmpty()) {
        emit(hostName);
      }
    `,
  },
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
    collect({ source: 'host.domain' }),
    collect({ source: 'host.hostname' }),
    collect({ source: 'host.id' }),
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
    collect({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    collect({ source: 'host.mac' }),
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
