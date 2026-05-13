/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  HEALTH_DATA_STREAM_NAME,
  HEALTH_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';

export const HEALTH_INDEX_TEMPLATE: IndicesPutIndexTemplateRequest = {
  name: HEALTH_INDEX_TEMPLATE_NAME,
  index_patterns: [HEALTH_DATA_STREAM_NAME],
  priority: 500,
  data_stream: {
    hidden: true,
  },
  _meta: {
    description: 'Index template for SLO health datastream',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
  template: {
    lifecycle: {
      data_retention: '7d',
    },
    settings: {
      auto_expand_replicas: '0-1',
    },
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        scanId: { type: 'keyword' },
        spaceId: { type: 'keyword' },
        slo: {
          properties: {
            id: { type: 'keyword' },
            revision: { type: 'integer' },
          },
        },
        health: {
          properties: {
            isProblematic: { type: 'boolean' },
          },
        },
      },
    },
  },
};
