/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { fleetIntegrations, trustedApps } = getPageObjects(['trustedApps', 'fleetIntegrations']);
  const policyTestResources = getService('policyTestResources');
  const testSubjects = getService('testSubjects');

  describe('When in the Fleet application', function () {
    describe('and on the Endpoint Integration details page', () => {
      beforeEach(async () => {
        await fleetIntegrations.navigateToIntegrationDetails(
          await policyTestResources.getEndpointPkgKey()
        );
      });

      it('should show the Custom tab', async () => {
        await fleetIntegrations.integrationDetailCustomTabExistsOrFail();
      });

      it('should display the endpoint custom content', async () => {
        await (await fleetIntegrations.findIntegrationDetailCustomTab()).click();
        await testSubjects.existOrFail('fleetEndpointPackageCustomContent');
      });

      it('should show the Trusted Apps page when link is clicked', async () => {
        await (await fleetIntegrations.findIntegrationDetailCustomTab()).click();
        await (await testSubjects.find('linkToTrustedApps')).click();
        await trustedApps.ensureIsOnTrustedAppsListPage();
      });
    });
  });
}
