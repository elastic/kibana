/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { isRegistryEnabled, getRegistryUrlFromTestEnv } from '../registry';
import { getRegistryUrl as getRegistryUrlFromIngest } from '../../../plugins/fleet/server';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');

    this.tags('ciGroup7');
    const log = getService('log');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
    log.info(`Package registry URL for tests: ${registryUrl}`);

    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./resolver/index'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./metadata_v1'));
    loadTestFile(require.resolve('./policy'));
    loadTestFile(require.resolve('./artifacts'));
    loadTestFile(require.resolve('./package'));
  });
}
