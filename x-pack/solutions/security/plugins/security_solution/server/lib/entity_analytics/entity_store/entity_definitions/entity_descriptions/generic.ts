/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newestValue } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions } from './common';

export const GENERIC_DEFINITION_VERSION = '1.0.0';
export const GENERIC_IDENTITY_FIELD = 'entity.id';
export const genericEntityEngineDescription: EntityDescription = {
  entityType: 'generic',
  version: GENERIC_DEFINITION_VERSION,
  identityField: GENERIC_IDENTITY_FIELD,
  settings: {
    timestampField: '@timestamp',
  },
  fields: [
    newestValue({ source: 'entity.name' }),
    newestValue({ source: 'entity.source' }),
    newestValue({ source: 'entity.category' }),
    newestValue({ source: 'entity.type' }),
    newestValue({ source: 'entity.address' }),
    ...getCommonFieldDescriptions('generic'),
  ],
};
