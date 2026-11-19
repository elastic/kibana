/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout-oblt';
import { K8S_ARCHIVE, K8S_TSDS_INDEX, K8S_TSDS_INDEX_TEMPLATE } from './constants';

/**
 * Loads the `k8s_deployment` archive once per worker before any spec runs. The `types` route reads
 * no data; the `list` spec reads it.
 */
export const apiTest = baseApiTest.extend<{}, { seedK8sDeployments: void }>({
  seedK8sDeployments: [
    async ({ esArchiver, esClient }, use) => {
      // Elasticsearch's built-in `metrics-otel@template` creates data streams only and matches the
      // archive's time-series index, which must be a plain index to keep fixed timestamps. A
      // higher-priority template without `data_stream` lets the archive create it; esArchiver
      // cannot load index templates itself. The template only matters while the index is created,
      // so it is deleted right after the load and never outlives it.
      await esClient.indices.putIndexTemplate({
        name: K8S_TSDS_INDEX_TEMPLATE,
        index_patterns: [K8S_TSDS_INDEX],
        priority: 500,
        template: {},
      });
      try {
        await esArchiver.loadIfNeeded(K8S_ARCHIVE);
      } finally {
        await esClient.indices.deleteIndexTemplate({ name: K8S_TSDS_INDEX_TEMPLATE });
      }
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});

export { INTERNAL_HEADERS, K8S_ARCHIVE, listPath, TYPES_PATH } from './constants';
