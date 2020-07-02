/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('endpoint', function () {
    this.tags('ciGroup7');
    const ingestManager = getService('ingestManager');
    before(async () => {
      await ingestManager.setup();
    });
    loadTestFile(require.resolve('./endpoint_list'));
    loadTestFile(require.resolve('./policy_list'));
    loadTestFile(require.resolve('./policy_details'));
  });
}
