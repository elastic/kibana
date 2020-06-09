/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('graph app', function () {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./graph'));
  });
}
