/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

export const monitorConfigMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
          normalizer: 'lowercase',
        },
      },
    },
    type: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
    },
    urls: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
    },
    hosts: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
    },
    journey_id: {
      type: 'keyword',
    },
    project_id: {
      type: 'keyword',
      fields: {
        text: {
          type: 'text',
        },
      },
    },
    origin: {
      type: 'keyword',
    },
    hash: {
      type: 'keyword',
    },
    locations: {
      properties: {
        id: {
          type: 'keyword',
          ignore_above: 256,
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        label: {
          type: 'text',
        },
      },
    },
    custom_heartbeat_id: {
      type: 'keyword',
    },
    id: {
      type: 'keyword',
    },
    config_id: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
      fields: {
        text: {
          type: 'text',
        },
      },
    },
    schedule: {
      properties: {
        number: {
          type: 'integer',
        },
      },
    },
    enabled: {
      type: 'boolean',
    },
    alert: {
      properties: {
        status: {
          properties: {
            enabled: {
              type: 'boolean',
            },
          },
        },
        tls: {
          properties: {
            enabled: {
              type: 'boolean',
            },
          },
        },
      },
    },
    throttling: {
      properties: {
        label: {
          type: 'keyword',
        },
      },
    },
    maintenance_windows: {
      type: 'keyword',
    },
  },
};
