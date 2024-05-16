/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';
import { targetTags } from '../../target_tags';

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

  describe('When on the Endpoint Policy List Page', function () {
    targetTags(this, ['@ess', '@serverless']);

    before(async () => {
      await browser.refresh();
    });

    describe('with no policies', () => {
      it('shows the empty page', async () => {
        await pageObjects.policy.navigateToPolicyList();
        await testSubjects.existOrFail('emptyPolicyTable');
      });
      it('navigates to Fleet and ensures the integration page is loaded correctly', async () => {
        const fleetButton = await testSubjects.find('onboardingStartButton');
        await fleetButton.click();
        await testSubjects.existOrFail('createPackagePolicy_pageTitle');
        expect(await testSubjects.getVisibleText('createPackagePolicy_pageTitle')).to.equal(
          'Add Elastic Defend integration'
        );
      });
      it('navigates back to the policy list page', async () => {
        const cancelButton = await testSubjects.find('createPackagePolicy_cancelBackLink');
        cancelButton.click();
        await pageObjects.policy.ensureIsOnListPage();
      });
    });
    // FLAKY: https://github.com/elastic/kibana/issues/135558
    describe.skip('with policies', () => {
      let indexedData: IndexedHostsAndAlertsResponse;
      let policyInfo: PolicyTestResourceInfo;
      before(async () => {
        indexedData = await endpointTestResources.loadEndpointData();
        policyInfo = await policyTestResources.createPolicy();
        await browser.refresh();
      });
      after(async () => {
        if (indexedData) {
          await endpointTestResources.unloadEndpointData(indexedData);
        }
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });
      it('shows the policy list table', async () => {
        await pageObjects.policy.navigateToPolicyList();
        await testSubjects.existOrFail('policyListTable');
      });
      it('navigates to the policy details page when the policy name is clicked and returns back to the policy list page using the header back button', async () => {
        const policyName = (await testSubjects.findAll('policyNameCellLink'))[0];
        await policyName.click();
        await pageObjects.policy.ensureIsOnDetailsPage();
        const backButton = await testSubjects.find('policyDetailsBackLink');
        await backButton.click();
        await pageObjects.policy.ensureIsOnListPage();
      });
      describe('when the endpoint count link is clicked', () => {
        it('navigates to the endpoint list page filtered by policy', async () => {
          const endpointCount = (await testSubjects.findAll('policyEndpointCountLink'))[0];
          await endpointCount.click();
          await pageObjects.endpoint.ensureIsOnEndpointListPage();
        });
        it('admin searchbar contains the selected policy id', async () => {
          const expectedPolicyId = indexedData.integrationPolicies[0].id;
          await pageObjects.endpoint.ensureIsOnEndpointListPage();
          expect(await testSubjects.getVisibleText('adminSearchBar')).to.equal(
            `united.endpoint.Endpoint.policy.applied.id : "${expectedPolicyId}"`
          );
        });
        it('endpoint table shows the endpoints associated with selected policy', async () => {
          const expectedPolicyName = indexedData.integrationPolicies[0].name;
          await pageObjects.endpoint.ensureIsOnEndpointListPage();
          const policyName = (await testSubjects.findAll('policyNameCellLink'))[0];
          expect(await policyName.getVisibleText()).to.be.equal(
            expectedPolicyName.substring(0, expectedPolicyName.indexOf('-'))
          );
        });
        it('returns back to the policy list page when the header back button is clicked', async () => {
          await pageObjects.endpoint.ensureIsOnEndpointListPage();
          const backButton = await testSubjects.find('endpointListBackLink');
          await backButton.click();
          await pageObjects.policy.ensureIsOnListPage();
        });
      });
    });
  });
}
