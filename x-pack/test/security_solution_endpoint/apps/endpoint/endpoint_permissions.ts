/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../../common/services/security_solution';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['security', 'endpoint']);
  const testSubjects = getService('testSubjects');

  describe('Endpoint permissions:', () => {
    before(async () => {
      // load data into the system
      // should we use the data_indexer? or esArchive?

      // Force a logout so that we start from the login page
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // unload data from the system
    });

    // Run the same set of tests against all of the Security Solution roles
    for (const role of Object.keys(ROLES) as Array<keyof typeof ROLES>) {
      describe(`when running with user/role [${role}]`, () => {
        beforeEach(async () => {
          // create role/user
          await createUserAndRole(getService, ROLES[role]);

          // log back in with new uer
          await PageObjects.security.login(role, 'changeme');
        });

        afterEach(async () => {
          // Log the user back out
          await PageObjects.security.forceLogout();

          // delete role/user
          await deleteUserAndRole(getService, ROLES[role]);
        });

        it('should NOT allow access to endpoint management pages', async () => {
          await PageObjects.endpoint.navigateToEndpointList();
          await testSubjects.existOrFail('noIngestPermissions');
        });

        it('should display endpoint data on Host Details', async () => {});

        it('should display endpoint data on Alert Details', async () => {});
      });
    }
  });
};
