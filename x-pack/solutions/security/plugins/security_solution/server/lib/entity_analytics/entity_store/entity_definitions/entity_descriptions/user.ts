/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions } from './common';
import { collectValues as collect } from './field_utils';

export const USER_DEFINITION_VERSION = '1.0.0';
export const USER_IDENTITY_FIELD = 'user.name';
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
  fields: [
    collect({ source: 'user.domain' }),
    collect({ source: 'user.email' }),
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
    collect({ source: 'user.id' }),
    collect({ source: 'user.roles' }),
    ...getCommonFieldDescriptions('user'),
  ],
};
