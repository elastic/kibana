/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function savedObjectsManagementApp({ loadTestFile }: FtrProviderContext) {
  describe('Saved objects management', function savedObjectsManagementAppTestSuite() {
    this.tags(['ciGroup2', 'skipFirefox']);

    loadTestFile(require.resolve('./spaces_integration'));
    loadTestFile(require.resolve('./feature_controls/saved_objects_management_security'));
    loadTestFile(require.resolve('./import_saved_objects_between_versions'));
    loadTestFile(require.resolve('./multi_space_import'));
  });
}
