/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function savedObjectsManagementApp({ loadTestFile }: FtrProviderContext) {
  describe('Saved objects management', function savedObjectsManagementAppTestSuite() {
    this.tags(['ciGroup2', 'skipFirefox']);

    loadTestFile(require.resolve('./import_saved_objects_between_versions_6.x_7.x'));
  });
}
