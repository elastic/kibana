/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions } from './common';
import { collectValues as collect, newestValue } from './field_utils';

export const SERVICE_DEFINITION_VERSION = '1.0.0';
export const SERVICE_IDENTITY_FIELD = 'service.name';

export const serviceEntityEngineDescription: EntityDescription = {
  entityType: 'service',
  version: SERVICE_DEFINITION_VERSION,
  identityField: SERVICE_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  settings: {
    timestampField: '@timestamp',
  },
  fields: [
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
  ],
};
