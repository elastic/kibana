/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const PRIVILEGED_USER_MAPPING: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    created_at: {
      type: 'date',
    },
    is_privileged: {
      type: 'boolean',
    },
    observations: {
      type: 'nested',
      properties: {
        observation_type: {
          type: 'keyword',
        },
        summary: {
          type: 'text',
        },
        raw_event: {
          type: 'object',
        },
        timestamp: {
          type: 'date',
        },
        ingested: {
          type: 'date',
        },
      },
    },
    user: {
      properties: {
        id: {
          type: 'keyword',
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'text',
            },
          },
        },
      },
    },
  },
};

export const LOGIN_MAPPING: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    source: {
      properties: {
        ip: {
          type: 'ip',
        },
      },
    },
    user: {
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
      },
    },
  },
};
