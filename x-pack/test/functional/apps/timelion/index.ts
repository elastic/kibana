/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function timelion({ loadTestFile }: FtrProviderContext) {
  describe('Timelion', function visualizeTestSuite() {
    // unskipped due to flakiness in cloud in v7.15 and 7.14
    // timelion app is hidden in these versions and is being removed in 7.16
    this.tags(['ciGroup4', 'skipFirefox', 'skipCloud']);

    loadTestFile(require.resolve('./feature_controls/timelion_security'));
    loadTestFile(require.resolve('./feature_controls/timelion_spaces'));
  });
}
