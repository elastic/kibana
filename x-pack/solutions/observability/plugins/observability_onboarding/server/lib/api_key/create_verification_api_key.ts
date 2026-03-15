/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function createVerificationApiKey(esClient: ElasticsearchClient, name: string) {
  const timestamp = new Date().toISOString();

  return esClient.security.createApiKey({
    name: `${name}-verification-${timestamp}`,
    expiration: `${ONE_HOUR_MS}ms`,
    metadata: {
      managed: true,
      application: 'observability-onboarding',
    },
    role_descriptors: {
      otel_verification: {
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-*-*', 'logs', 'logs.*', 'metrics-*-*', 'traces-*-*'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
    },
  });
}
