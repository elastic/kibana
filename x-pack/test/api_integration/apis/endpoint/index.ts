/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function endpointAPIIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('Endpoint plugin', function() {
    this.tags(['endpoint']);
    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./endpoints'));
    loadTestFile(require.resolve('./alerts'));
  });
}
