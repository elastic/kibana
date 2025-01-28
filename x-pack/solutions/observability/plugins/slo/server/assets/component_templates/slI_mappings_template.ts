/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';

export const SLI_MAPPINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  template: {
    mappings: {
      properties: {
        event: {
          properties: {
            ingested: {
              type: 'date',
              format: 'strict_date_optional_time',
            },
          },
        },
        '@timestamp': {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        // APM service and transaction specific fields
        service: {
          properties: {
            name: {
              type: 'keyword',
            },
            environment: {
              type: 'keyword',
            },
          },
        },
        transaction: {
          properties: {
            name: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
          },
        },
        // Synthetics specific fields
        monitor: {
          properties: {
            id: {
              type: 'keyword',
            },
            config_id: {
              type: 'keyword',
            },
            name: {
              type: 'keyword',
            },
          },
        },
        observer: {
          properties: {
            name: {
              type: 'keyword',
            },
            geo: {
              properties: {
                name: {
                  type: 'keyword',
                },
              },
            },
          },
        },
        // SLO field mappings
        slo: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 256,
            },
            revision: {
              type: 'long',
            },
            instanceId: {
              type: 'keyword',
            },
            numerator: {
              type: 'long',
            },
            denominator: {
              type: 'long',
            },
            isGoodSlice: {
              type: 'byte',
            },
            groupings: {
              type: 'flattened',
            },
          },
        },
      },
    },
  },
  _meta: {
    description: 'Mappings for SLO rollup data',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};
