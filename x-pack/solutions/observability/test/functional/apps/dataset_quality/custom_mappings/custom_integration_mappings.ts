/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const logsNginxMappings = (dataset: string): MappingTypeMapping => ({
  properties: {
    '@timestamp': {
      type: 'date',
      ignore_malformed: false,
    },
    cloud: {
      properties: {
        image: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
      },
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
    ecs: {
      properties: {
        version: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    error: {
      properties: {
        message: {
          type: 'match_only_text',
        },
      },
    },
    event: {
      properties: {
        agent_id_status: {
          type: 'keyword',
          ignore_above: 1024,
        },
        dataset: {
          type: 'constant_keyword',
          value: 'nginx.access',
        },
        ingested: {
          type: 'date',
          format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
          ignore_malformed: false,
        },
        module: {
          type: 'constant_keyword',
          value: 'nginx',
        },
      },
    },
    host: {
      properties: {
        containerized: {
          type: 'boolean',
        },
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
        os: {
          properties: {
            build: {
              type: 'keyword',
              ignore_above: 1024,
            },
            codename: {
              type: 'keyword',
              ignore_above: 1024,
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
        offset: {
          type: 'long',
        },
      },
    },
    network: {
      properties: {
        bytes: {
          type: 'long',
        },
      },
    },
    nginx: {
      properties: {
        access: {
          properties: {
            remote_ip_list: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
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
