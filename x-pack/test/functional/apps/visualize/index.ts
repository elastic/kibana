/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from 'x-pack/test/types/providers';

// tslint:disable:no-default-export
export default function visualize({ loadTestFile }: KibanaFunctionalTestDefaultProviders) {
  describe('Visualize', function visualizeTestSuite() {
    this.tags('ciGroup4');

    loadTestFile(require.resolve('./feature_controls/visualize_security'));
    loadTestFile(require.resolve('./feature_controls/visualize_spaces'));
  });
}
