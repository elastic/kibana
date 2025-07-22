/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/ftr_provider_context';
import {
  createSpacesAndUsers,
  deleteSpacesAndUsers,
  activateUserProfiles,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/authentication';

export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases security and spaces enabled: trial', function () {
    before(async () => {
      await createSpacesAndUsers(getService);
      // once a user profile is created the only way to remove it is to delete the user and roles, so best to activate
      // before all the tests
      await activateUserProfiles(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    loadTestFile(require.resolve('..'));
  });
};
