/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { skipIfNoRegistry, isRegistryEnabled } from '../registry';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;
  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');
    const log = getService('log');

    this.tags('ciGroup7');

    skipIfNoRegistry(log);
    before(async () => {
      if (isRegistryEnabled()) {
        await ingestManager.setup();
      } else {
        log.warning('skipping ingest setup because the registry location was not defined');
      }
    });
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./policy'));
  });
}
