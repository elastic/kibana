/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, loadTestFile }: FtrProviderContext) => {
  describe('Monitoring app alerts', function () {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./cluster_list'));
    loadTestFile(require.resolve('./cluster_overview'));
  });
};
