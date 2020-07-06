/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function endpointAPIIntegrationTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');
    this.tags(['endpoint']);
    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./policy'));
  });
}
