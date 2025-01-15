/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  MONITOR_CLUSTER,
  INDEX_LOGS_AND_METRICS,
  INDEX_LOGS_METRICS_AND_TRACES,
} from './privileges';

export function createShipperApiKey(esClient: ElasticsearchClient, name: string, withAPM = false) {
  // Based on https://www.elastic.co/guide/en/fleet/master/grant-access-to-elasticsearch.html#create-api-key-standalone-agent
  return esClient.security.createApiKey({
    body: {
      name,
      metadata: {
        managed: true,
        application: 'logs',
      },
      role_descriptors: {
        standalone_agent: {
          cluster: [MONITOR_CLUSTER],
          indices: [withAPM ? INDEX_LOGS_METRICS_AND_TRACES : INDEX_LOGS_AND_METRICS],
        },
      },
    },
  });
}
