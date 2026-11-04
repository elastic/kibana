/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { setUpDetectionEngine } from './helpers/requests';

export default function ({ getService, loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const retry = getService('retry');

  describe('Significant Events Endpoints', () => {
    // The detection engine only runs as a service account, so pausing, resuming and creating
    // queries (and so rules) need the space set up. The workflows plugin can still be starting.
    before(async () => {
      const apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await retry.tryForTime(60_000, () => setUpDetectionEngine(apiClient, esClient));
    });

    loadTestFile(require.resolve('./significant_events'));
    loadTestFile(require.resolve('./knowledge_indicator_features'));
    loadTestFile(require.resolve('./knowledge_indicator_queries'));
    loadTestFile(require.resolve('./maintenance'));
    loadTestFile(require.resolve('./content'));
  });
}
