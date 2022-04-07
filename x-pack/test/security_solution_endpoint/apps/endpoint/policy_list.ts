/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { IndexedHostsAndAlertsResponse } from '../../../../plugins/security_solution/common/endpoint/index_data';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'policy',
    'endpointPageUtils',
    'ingestManagerCreatePackagePolicy',
    'trustedApps',
  ]);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');
  const endpointTestResources = getService('endpointTestResources');

  describe('When on the Endpoint Policy List Page', () => {
    before(async () => {
      const endpointPackage = await policyTestResources.getEndpointPackage();
      await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
      await browser.refresh();
    });

    describe('with no policies', () => {
      it('shows the empty page', async () => {
        await pageObjects.policy.navigateToPolicyList();
        await testSubjects.existOrFail('emptyPolicyTable');
      });
      it('navigates to Fleet to add the Endpoint Security integration', async () => {
        const fleetButton = await testSubjects.find('onboardingStartButton');
        await fleetButton.click();
        await testSubjects.existOrFail('createPackagePolicy_pageTitle');
        expect(await testSubjects.getVisibleText('createPackagePolicy_pageTitle')).to.equal(
          'Add Endpoint Security integration'
        );
      });
    });
    describe('with policies', () => {
      let indexedData: IndexedHostsAndAlertsResponse;
      before(async () => {
        indexedData = await endpointTestResources.loadEndpointData();
        await browser.refresh();
      });
      after(async () => {
        if (indexedData) {
          await endpointTestResources.unloadEndpointData(indexedData);
        }
      });
      it('shows the policy list table', async () => {
        await pageObjects.policy.navigateToPolicyList();
        await testSubjects.existOrFail('policyListTable');
      });
      it('navigates to the policy details page when the policy name is clicked and returns back to the policy list page using the header back button', async () => {
        const policyName = await testSubjects.find('policyNameCellLink');
        await policyName.click();
        pageObjects.policy.ensureIsOnDetailsPage();
        const backButton = await testSubjects.find('policyDetailsBackLink');
        await backButton.click();
        pageObjects.policy.ensureIsOnListPage();
      });
      it('navigates to the endpoint list page filtered by policy when the endpoint count number is clicked and returns back to the policy list page using the header back button', async () => {
        const endpointCount = await testSubjects.find('policyEndpointCountLink');
        await endpointCount.click();
        pageObjects.endpoint.ensureIsOnEndpointListPage();
        const backButton = await testSubjects.find('endpointListBackLink');
        await backButton.click();
        pageObjects.policy.ensureIsOnListPage();
      });
    });
  });
}
