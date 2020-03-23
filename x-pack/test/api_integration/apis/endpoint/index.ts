/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { IngestInitializer } from '../../../epm_api_integration/apis/setup_ingest';

export default function endpointAPIIntegrationTests(context: FtrProviderContext) {
  const { loadTestFile } = context;
  const ingestManager = new IngestInitializer(context);

  describe('Endpoint plugin', function() {
    before(async () => {
      /**
       * Setup the ingest manager plugin, this installs the endpoint package which is needed for retrieving the index
       * patterns.
       */
      await ingestManager.before();
    });

    after(() => {
      /**
       * Shutdown the ingest manager package registry mocks
       */
      ingestManager.after();
    });

    this.tags(['endpoint']);
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./alerts'));
  });
}
