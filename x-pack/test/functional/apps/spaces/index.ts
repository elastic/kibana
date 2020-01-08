/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function spacesApp({ loadTestFile }: FtrProviderContext) {
  describe('Spaces app', function spacesAppTestSuite() {
    this.tags('ciGroup4');

    loadTestFile(require.resolve('./copy_saved_objects'));
    loadTestFile(require.resolve('./feature_controls/spaces_security'));
    loadTestFile(require.resolve('./spaces_selection'));
    loadTestFile(require.resolve('./enter_space'));
  });
}
