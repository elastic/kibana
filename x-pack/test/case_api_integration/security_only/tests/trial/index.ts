/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases security and spaces enabled: trial', function () {
    // Fastest ciGroup for the moment.
    this.tags('ciGroup5');

    before(async () => {
      // since spaces are disabled this changes each role to have access to all available spaces (it'll just be the default one)
      await createUsersAndRoles(getService, ['*']);
    });

    after(async () => {
      await deleteUsersAndRoles(getService);
    });

    // Trial
    loadTestFile(require.resolve('./cases/push_case'));
    loadTestFile(require.resolve('./cases/user_actions/get_all_user_actions'));
    loadTestFile(require.resolve('./configure/index'));

    // Common
    loadTestFile(require.resolve('../common'));
  });
};
