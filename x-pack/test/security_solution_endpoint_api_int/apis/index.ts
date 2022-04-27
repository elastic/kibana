/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { FtrProviderContext } from '../ftr_provider_context';
import { isRegistryEnabled, getRegistryUrlFromTestEnv } from '../registry';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Endpoint plugin', function () {
    this.tags('ciGroup9');

    const ingestManager = getService('ingestManager');

    const log = getService('log');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
    log.info(`Package registry URL for tests: ${registryUrl}`);

    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./policy'));
    loadTestFile(require.resolve('./package'));
    loadTestFile(require.resolve('./endpoint_authz'));
    loadTestFile(require.resolve('./endpoint_artifacts/trusted_apps'));
    loadTestFile(require.resolve('./endpoint_artifacts/event_filters'));
    loadTestFile(require.resolve('./endpoint_artifacts/host_isolation_exceptions'));
    loadTestFile(require.resolve('./endpoint_artifacts/blocklists'));
  });
}
