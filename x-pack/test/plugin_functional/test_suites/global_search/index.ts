/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // See https://github.com/elastic/kibana/issues/81397
  describe.skip('GlobalSearch API', function () {
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./global_search_api'));
    loadTestFile(require.resolve('./global_search_providers'));
    loadTestFile(require.resolve('./global_search_bar'));
  });
}
