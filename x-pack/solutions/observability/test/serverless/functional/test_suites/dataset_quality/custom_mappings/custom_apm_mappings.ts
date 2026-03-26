/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

// 27 fields total (same structure as logsSynthMappings, with event.ingested and tags added)
export const logsApmAppMappings = (_dataset: string): MappingTypeMapping => ({
  properties: {
    '@timestamp': {
      type: 'date',
      ignore_malformed: false,
    },
    data_stream: {
      properties: {
        dataset: {
          type: 'constant_keyword',
        },
        namespace: {
          type: 'constant_keyword',
        },
        type: {
          type: 'constant_keyword',
        },
      },
    },
    event: {
      properties: {
        dataset: {
          type: 'keyword',
          ignore_above: 1024,
        },
        ingested: {
          type: 'date',
          format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
          ignore_malformed: false,
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
        level: {
          type: 'keyword',
          ignore_above: 1024,
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
    tags: {
      type: 'keyword',
      ignore_above: 1024,
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
    trace: {
      properties: {
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  },
});
