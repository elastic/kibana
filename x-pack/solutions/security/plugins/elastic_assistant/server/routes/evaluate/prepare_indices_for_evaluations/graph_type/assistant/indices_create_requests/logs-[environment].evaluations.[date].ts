/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export const logsIndexCreateRequest: IndicesCreateRequest = {
  index: 'logs-[environment].evaluations.[date]',
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      bytes_transferred: { type: 'long' },
      command_line: { type: 'text' },
      destination: {
        properties: {
          ip: { type: 'ip' },
          port: { type: 'long' },
          address: { type: 'keyword' },
        },
      },
      dns: {
        properties: {
          question: {
            properties: {
              name: { type: 'keyword' },
              registered_domain: { type: 'keyword' },
            },
          },
        },
      },
      error_code: { type: 'keyword' },
      event: {
        properties: {
          action: { type: 'keyword' },
          code: { type: 'long' },
        },
      },
      file: {
        properties: {
          name: { type: 'text' },
        },
      },
      group: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      host: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      ip: { type: 'ip' },
      log: {
        properties: {
          message: { type: 'text' },
        },
      },
      network: {
        properties: {
          bytes: { type: 'long' },
          direction: { type: 'keyword' },
        },
      },
      process: {
        properties: {
          name: { type: 'keyword' },
          working_directory: { type: 'keyword' },
        },
      },
      source: {
        properties: {
          ip: { type: 'ip' },
          bytes: { type: 'long' },
        },
      },
      system: {
        properties: {
          cpu: {
            properties: {
              total: {
                properties: {
                  norm: {
                    properties: {
                      pct: { type: 'float' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      url: {
        properties: {
          domain: { type: 'keyword' },
        },
      },
      user: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      user_agent: {
        properties: {
          original: { type: 'text' },
        },
      },
    },
  },
};
