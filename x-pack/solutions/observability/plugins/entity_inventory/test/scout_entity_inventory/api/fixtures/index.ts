/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout-oblt';
import { K8S_ARCHIVE } from './constants';

/**
 * Loads the `k8s_deployment` archive once per worker before any spec runs. The `types` route reads
 * no data; the archive is there for the `_list` and `_count` specs that build on this suite.
 */
export const apiTest = baseApiTest.extend<{}, { seedK8sDeployments: void }>({
  seedK8sDeployments: [
    async ({ esArchiver }, use) => {
      await esArchiver.loadIfNeeded(K8S_ARCHIVE);
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});

export { INTERNAL_HEADERS, K8S_ARCHIVE, TYPES_PATH } from './constants';
