/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { apiTest as baseApiTest } from '@kbn/scout-oblt';
import {
  K8S_ARCHIVE,
  K8S_FIXTURE_DATA_STREAM_TEMPLATES,
  K8S_FIXTURE_PLAIN_INDICES,
  K8S_STATE_TSDS_INDEX,
  K8S_TSDS_INDEX,
  K8S_TSDS_INDEX_TEMPLATE,
} from './constants';

/**
 * Removes only what this suite creates, so later suites on the shared cluster start clean. Data
 * streams go first: a template cannot be deleted while a data stream uses it. Missing resources are
 * ignored.
 */
const deleteK8sFixtureResources = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.deleteDataStream(
    { name: Object.keys(K8S_FIXTURE_DATA_STREAM_TEMPLATES) },
    { ignore: [404] }
  );
  await esClient.indices.delete(
    { index: K8S_FIXTURE_PLAIN_INDICES, ignore_unavailable: true },
    { ignore: [404] }
  );
  await esClient.indices.deleteIndexTemplate(
    { name: Object.values(K8S_FIXTURE_DATA_STREAM_TEMPLATES) },
    { ignore: [404] }
  );
};

/**
 * Loads the `k8s_deployment` archive once per worker before any spec runs. The `types` route reads
 * no data; the `list` spec reads it.
 */
export const apiTest = baseApiTest.extend<{}, { seedK8sDeployments: void }>({
  seedK8sDeployments: [
    async ({ esArchiver, esClient }, use) => {
      // `loadIfNeeded` skips anything that exists, so remove what a crashed run or an older archive
      // left behind before loading.
      await deleteK8sFixtureResources(esClient);
      // Elasticsearch's built-in `metrics-otel@template` and `metrics` templates create data streams
      // only and match the archive's time-series indices, which must be plain indices to keep fixed
      // timestamps. A higher-priority template without `data_stream` lets the archive create them;
      // esArchiver cannot load index templates itself. The template only matters while the indices
      // are created, so it is deleted right after the load and never outlives them.
      await esClient.indices.putIndexTemplate({
        name: K8S_TSDS_INDEX_TEMPLATE,
        index_patterns: [K8S_TSDS_INDEX, K8S_STATE_TSDS_INDEX],
        priority: 500,
        template: {},
      });
      try {
        try {
          await esArchiver.loadIfNeeded(K8S_ARCHIVE);
        } finally {
          await esClient.indices.deleteIndexTemplate({ name: K8S_TSDS_INDEX_TEMPLATE });
        }
        await use();
      } finally {
        await deleteK8sFixtureResources(esClient);
      }
    },
    { scope: 'worker', auto: true },
  ],
});

export {
  FILTER_VALUES_PATH,
  INTERNAL_HEADERS,
  K8S_ARCHIVE,
  K8S_FIXTURE_DATA_STREAM_TEMPLATES,
  K8S_FIXTURE_READER_ROLE,
  K8S_FIXTURE_READER_WITHOUT_AGENT_TSDS_ROLE,
  listPath,
  TYPES_PATH,
} from './constants';
