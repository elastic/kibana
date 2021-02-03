/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  describe('Actions and Triggers app', function () {
    this.tags('ciGroup10');
    loadTestFile(require.resolve('./home_page'));
    loadTestFile(require.resolve('./alerts_list'));
    loadTestFile(require.resolve('./alert_create_flyout'));
    loadTestFile(require.resolve('./details'));
    loadTestFile(require.resolve('./connectors'));
  });
};
