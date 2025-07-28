/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from '../test_users';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function loadTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('EPM Endpoints', () => {
    before(async () => {
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./get'));
  });
}
