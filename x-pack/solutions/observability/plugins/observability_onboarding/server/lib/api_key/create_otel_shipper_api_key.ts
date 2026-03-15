/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export function createOtelShipperApiKey(esClient: ElasticsearchClient, name: string) {
  const timestamp = new Date().toISOString();

  return esClient.security.createApiKey({
    name: `${name}-shipper-${timestamp}`,
    metadata: {
      managed: true,
      application: 'observability-onboarding',
    },
    role_descriptors: {
      otel_shipper: {
        cluster: ['monitor', 'manage_ilm'],
        indices: [
          {
            names: ['logs-*-*', 'logs', 'logs.*', 'metrics-*-*', 'traces-*-*'],
            privileges: ['create_index', 'auto_configure', 'write'],
          },
        ],
      },
    },
  });
}
