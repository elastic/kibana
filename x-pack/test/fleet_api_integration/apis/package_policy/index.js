/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from '../test_users';

export default function loadTests({ loadTestFile, getService }) {
  describe('Package policies', () => {
    before(async () => {
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./get'));

    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./upgrade'));
    loadTestFile(require.resolve('./input_package_create_upgrade'));
    loadTestFile(require.resolve('./input_package_rollback'));
  });
}
