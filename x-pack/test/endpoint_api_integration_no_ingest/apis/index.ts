/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function endpointAPIIntegrationTests({ loadTestFile }: FtrProviderContext) {
  // endpoint was not released in 7.8 so disabling all the tests
  describe.skip('Endpoint plugin', function () {
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./index_pattern'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./alerts'));
  });
}
