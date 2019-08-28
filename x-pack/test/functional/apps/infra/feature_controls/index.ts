/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ loadTestFile }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/35932
  describe.skip('feature controls', function() {
    this.tags('skipFirefox');
    loadTestFile(require.resolve('./infrastructure_security'));
    loadTestFile(require.resolve('./infrastructure_spaces'));
    loadTestFile(require.resolve('./logs_security'));
    loadTestFile(require.resolve('./logs_spaces'));
  });
}
