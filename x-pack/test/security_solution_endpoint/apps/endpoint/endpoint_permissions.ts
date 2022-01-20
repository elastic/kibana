/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../../common/services/security_solution';
import { IndexedHostsAndAlertsResponse } from '../../../../plugins/security_solution/common/endpoint/index_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['security', 'endpoint', 'detections', 'hosts']);
  const testSubjects = getService('testSubjects');
  const endpointTestResources = getService('endpointTestResources');
  const policyTestResources = getService('policyTestResources');

  describe('Endpoint permissions:', () => {
    let indexedData: IndexedHostsAndAlertsResponse;

    before(async () => {
      // todo: way to force an endpoint to be created in isolated mode so we can check that state in the UI
      const endpointPackage = await policyTestResources.getEndpointPackage();
      await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
      indexedData = await endpointTestResources.loadEndpointData();

      // Force a logout so that we start from the login page
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
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
          // NOTE: Logout needs to happen before anything else to avoid flaky behavior
          await PageObjects.security.forceLogout();

          // delete role/user
          await deleteUserAndRole(getService, ROLES[role]);
        });

        it('should NOT allow access to endpoint management pages', async () => {
          await PageObjects.endpoint.navigateToEndpointList();
          await testSubjects.existOrFail('noIngestPermissions');
        });

        it('should display endpoint data on Host Details', async () => {
          const endpoint = indexedData.hosts[0];
          await PageObjects.hosts.navigateToHostDetails(endpoint.host.name);
          const endpointSummary = await PageObjects.hosts.hostDetailsEndpointOverviewData();

          expect(endpointSummary['Endpoint integration policy']).to.be(
            endpoint.Endpoint.policy.applied.name
          );
          expect(endpointSummary['Endpoint version']).to.be(endpoint.agent.version);

          // The values for these are calculated, so let's just make sure its not teh default when no data is returned
          expect(endpointSummary['Policy status']).not.be('—');
          expect(endpointSummary['Agent status']).not.to.be('—');
        });

        // FIXME: this area (detections) is unstable and due to time, skipping it.
        //        The page does not always (its intermittent) display with the created roles. Sometimes you get a
        //        "not enought priviliges" and others the data shows up.
        it.skip('should display endpoint data on Alert Details', async () => {
          await PageObjects.detections.navigateToAlerts();
          await PageObjects.detections.openFirstAlertDetailsForHostName(
            indexedData.hosts[0].host.name
          );

          const hostAgentStatus = await testSubjects.getVisibleText('rowHostStatus');

          expect(hostAgentStatus).to.eql('Healthy');
        });
      });
    }
  });
};
