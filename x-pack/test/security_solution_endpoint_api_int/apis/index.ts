/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { isRegistryEnabled, getRegistryUrl } from '../registry';
import { DEFAULT_REGISTRY_URL } from '../../../plugins/ingest_manager/common';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');

    this.tags('ciGroup7');
    const log = getService('log');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrl() ?? DEFAULT_REGISTRY_URL;
    log.info(`Package registry URL for tests: ${registryUrl}`);

    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./resolver/entity_id'));
    loadTestFile(require.resolve('./resolver/entity'));
    loadTestFile(require.resolve('./resolver/tree'));
    loadTestFile(require.resolve('./resolver/children'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./policy'));
    loadTestFile(require.resolve('./artifacts'));
  });
}
