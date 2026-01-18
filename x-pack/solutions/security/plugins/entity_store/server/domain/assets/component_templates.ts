/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_ENTITY_COMPONENT_TEMPLATE_V2,
  ENTITY_EVENT_COMPONENT_TEMPLATE_V2,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V2,
} from '../constants';

// Copied from x-pack/platform/plugins/shared/entity_manager/server/templates/components/base_latest.ts

export const entitiesLatestBaseComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V2,
  _meta: {
    description:
      "Component template for the ECS fields used in the Elastic Entity Model's entity discovery framework's latest data set",
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-base.html',
    ecs_version: '8.0.0',
    managed: true,
  },
  template: {
    settings: {
      index: {
        mode: 'lookup',
      },
    },
    mappings: {
      properties: {
        entity: {
          properties: {
            display_name: {
              type: 'text',
              fields: {
                keyword: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
          },
        },
        labels: {
          type: 'object',
        },
        tags: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
  },
};

export const entitiesEntityComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: ENTITY_ENTITY_COMPONENT_TEMPLATE_V2,
  _meta: {
    description:
      "Component template for the entity fields used in the Elastic Entity Model's entity discovery framework",
    ecs_version: '8.0.0',
    managed: true,
  },
  template: {
    mappings: {
      properties: {
        entity: {
          properties: {
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            definition_id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            definition_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            schema_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            last_seen_timestamp: {
              type: 'date',
            },
            identity_fields: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
};

export const entitiesEventComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: ENTITY_EVENT_COMPONENT_TEMPLATE_V2,
  _meta: {
    description:
      "Component template for the event fields used in the Elastic Entity Model's entity discovery framework",
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-event.html',
    ecs_version: '8.0.0',
    managed: true,
  },
  template: {
    mappings: {
      properties: {
        event: {
          properties: {
            ingested: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};
