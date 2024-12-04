/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  activateUserProfiles,
} from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('Automatic Import enabled: basic', function () {
    before(async () => {
      await createUsersAndRoles(getService);
      // once a user profile is created the only way to remove it is to delete the user and roles, so best to activate
      // before all the tests
      await activateUserProfiles(getService);
    });

    after(async () => {
      await deleteUsersAndRoles(getService);
    });

    // Basic
    loadTestFile(require.resolve('./graphs/ecs'));
  });
};
