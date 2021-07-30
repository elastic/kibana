/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../../common/services/security_solution';
import { indexHostsAndAlerts } from '../../../../plugins/security_solution/common/endpoint/index_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['security', 'endpoint', 'detections']);
  const testSubjects = getService('testSubjects');
  const esClient = getService('es');
  const kbnClient = getService('kibanaServer');

  describe('Endpoint permissions:', () => {
    before(async () => {
      // load data into the system
      await indexHostsAndAlerts(
        esClient as Client,
        kbnClient,
        'seed',
        1,
        1,
        'metrics-endpoint.metadata-default', // TODO: are there `const`'s for these indexes so that we don't use static names here?
        'metrics-endpoint.policy-default',
        'logs-endpoint.events.process-default',
        'logs-endpoint.alerts-default',
        1,
        true
      );

      // Force a logout so that we start from the login page
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // unload data from the system
    });

    // Run the same set of tests against all of the Security Solution roles
    for (const role of Object.keys(ROLES) as Array<keyof typeof ROLES>) {
      describe(`when running with user/role [${role}]`, () => {
        before(async () => {
          // create role/user
          await createUserAndRole(getService, ROLES[role]);

          // log back in with new uer
          await PageObjects.security.login(role, 'changeme');
        });

        after(async () => {
          // Log the user back out
          await PageObjects.security.forceLogout();

          // delete role/user
          await deleteUserAndRole(getService, ROLES[role]);
        });

        it('should NOT allow access to endpoint management pages', async () => {
          await PageObjects.endpoint.navigateToEndpointList();
          await testSubjects.existOrFail('noIngestPermissions');
        });

        it('should display endpoint data on Host Details', async () => {
          // path: http://localhost:5601/app/security/hosts/Host-ku5jy6j0pw
          // await new Promise((r) => setTimeout(r, 60000));
        });

        it('should display endpoint data on Alert Details', async () => {
          await PageObjects.detections.navigateToAlerts();
          await PageObjects.detections.openFirstAlertDetailsForHostName('abc');
          await new Promise((r) => setTimeout(r, 60000));
        });
      });
    }
  });
};
