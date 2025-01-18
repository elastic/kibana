/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const logsSynthMappings = (dataset: string): MappingTypeMapping => ({
  properties: {
    '@timestamp': {
      type: 'date',
      ignore_malformed: false,
    },
    data_stream: {
      properties: {
        dataset: {
          type: 'constant_keyword',
          value: dataset,
        },
        namespace: {
          type: 'constant_keyword',
          value: 'default',
        },
        type: {
          type: 'constant_keyword',
          value: 'logs',
        },
      },
    },
    event: {
      properties: {
        dataset: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    host: {
      properties: {
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      },
    },
    input: {
      properties: {
        type: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    log: {
      properties: {
        file: {
          properties: {
            path: {
              type: 'keyword',
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
          },
        },
      },
    },
    message: {
      type: 'match_only_text',
    },
    network: {
      properties: {
        bytes: {
          type: 'long',
        },
      },
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      },
    },
    test_field: {
      type: 'keyword',
      ignore_above: 1024,
    },
    tls: {
      properties: {
        established: {
          type: 'boolean',
        },
      },
    },
  },
});
