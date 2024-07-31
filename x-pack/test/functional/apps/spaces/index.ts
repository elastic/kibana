/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function spacesApp({ loadTestFile }: FtrProviderContext) {
  describe('Spaces app', function spacesAppTestSuite() {
    loadTestFile(require.resolve('./copy_saved_objects'));
    loadTestFile(require.resolve('./feature_controls/spaces_security'));
    loadTestFile(require.resolve('./spaces_selection'));
    loadTestFile(require.resolve('./enter_space'));
    loadTestFile(require.resolve('./create_edit_space'));
  });
}
