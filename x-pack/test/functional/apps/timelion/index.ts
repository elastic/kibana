/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function timelion({ loadTestFile }: FtrProviderContext) {
  describe('Timelion', function visualizeTestSuite() {
    this.tags(['ciGroup4', 'skipFirefox']);

    loadTestFile(require.resolve('./feature_controls/timelion_security'));
    loadTestFile(require.resolve('./feature_controls/timelion_spaces'));
  });
}
