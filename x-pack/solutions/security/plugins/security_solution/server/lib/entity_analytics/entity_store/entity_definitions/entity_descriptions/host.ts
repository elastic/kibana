/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions } from './common';

export const HOST_DEFINITION_VERSION = '1.0.0';
export const HOST_IDENTITY_FIELD = 'host.name';
export const hostEntityEngineDescription: EntityDescription = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  identityField: HOST_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  settings: {
    timestampField: '@timestamp',
  },
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
  ],
};
