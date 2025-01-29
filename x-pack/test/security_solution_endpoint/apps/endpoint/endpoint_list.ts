/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../configs/ftr_provider_context';

import { targetTags } from '../../target_tags';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const endpointTestResources = getService('endpointTestResources');
  const policyTestResources = getService('policyTestResources');
  const endpointDataStreamHelpers = getService('endpointDataStreamHelpers');

  const expectedData = [
    [
      'Endpoint',
      'Agent status',
      'Policy',
      'Policy status',
      'OS',
      'IP address',
      'Version',
      'Last active',
      'Actions',
    ],
    [
      'Host-bhdpuumusb',
      'x',
      'x',
      'Unsupported',
      'Windows',
      '10.20.160.71, 10.67.81.87',
      'x',
      'x',
      '',
    ],
    [
      'Host-okyc8te0ki',
      'x',
      'x',
      'Warning',
      'Windows',
      '10.244.187.97, 10.45.118.67',
      'x',
      'x',
      '',
    ],
    [
      'Host-u5jy6j0pwb',
      'x',
      'x',
      'Warning',
      'macOS',
      '10.87.11.145, 10.117.106.109,10.242.136.97',
      'x',
      'x',
      '',
    ],
  ];

  const formattedTableData = async () => {
    const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');

    // Do not compare timestamps, Agent status, or Policy names since the data can be inconsistent.
    for (let i = 1; i < tableData.length; i++) {
      tableData[i][1] = 'x';
      tableData[i][2] = 'x';
      tableData[i][6] = 'x';
      tableData[i][7] = 'x';
    }

    return tableData;
  };

  describe('endpoint list', function () {
    targetTags(this, ['@ess', '@serverless']);

    let indexedData: IndexedHostsAndAlertsResponse;
    describe('when initially navigating to page', () => {
      before(async () => {
        await endpointDataStreamHelpers.deleteMetadataStream(getService);
        await endpointDataStreamHelpers.deleteAllDocsFromMetadataCurrentIndex(getService);
        await endpointDataStreamHelpers.deleteAllDocsFromMetadataUnitedIndex(getService);
        await pageObjects.endpoint.navigateToEndpointList();
      });
      it('finds no data in list and prompts onboarding to add policy', async () => {
        await testSubjects.exists('emptyPolicyTable');
      });
      it('navigates to fleet through the Enroll agent button when there are policies but no endpoints', async () => {
        const policyData = await policyTestResources.createPolicy();
        // refresh page
        await browser.refresh();
        await testSubjects.exists('emptyHostsTable');
        const firstPolicyOption = (
          await testSubjects.findService.allByCssSelector('.euiSelectableListItem')
        )[0];
        firstPolicyOption.click();
        await testSubjects.waitForEnabled('onboardingStartButton');
        await testSubjects.click('onboardingStartButton');
        await testSubjects.exists('agentEnrollmentFlyout');

        // cleanup
        await policyData.cleanup();
        await pageObjects.endpoint.navigateToEndpointList();
      });

      describe('when there is data,', () => {
        before(async () => {
          indexedData = await endpointTestResources.loadEndpointData({ numHosts: 3 });
          await pageObjects.endpoint.navigateToEndpointList();
          await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
            'endpointListTable',
            3,
            90000
          );
        });
        after(async () => {
          await endpointDataStreamHelpers.deleteAllDocsFromMetadataCurrentIndex(getService);
          await endpointDataStreamHelpers.deleteAllDocsFromMetadataUnitedIndex(getService);
          if (indexedData) {
            await endpointTestResources.unloadEndpointData(indexedData);
          }
        });

        it('finds page title', async () => {
          const title = await testSubjects.getVisibleText('header-page-title');
          expect(title).to.equal('Endpoints');
        });

        it('displays table data', async () => {
          const tableData = await formattedTableData();
          expect(tableData.sort()).to.eql(expectedData.sort());
        });

        describe('for the search bar', () => {
          before(async () => {
            await pageObjects.endpoint.waitForTableToHaveData('endpointListTable', 60000);
          });
          after(async () => {
            const adminSearchBar = await testSubjects.find('adminSearchBar');
            await adminSearchBar.clearValueWithKeyboard();
            await testSubjects.click('querySubmitButton');
          });
          it('when the kql query is `na`, table shows an empty list', async () => {
            const adminSearchBar = await testSubjects.find('adminSearchBar');
            await adminSearchBar.clearValueWithKeyboard();
            await adminSearchBar.type('na');
            await testSubjects.click('querySubmitButton');
            const expectedDataFromQuery = [
              [
                'Endpoint',
                'Agent status',
                'Policy',
                'Policy status',
                'OS',
                'IP address',
                'Version',
                'Last active',
                'Actions',
              ],
              ['No items found'],
            ];

            await pageObjects.endpoint.waitForTableToNotHaveData('endpointListTable', 10000);
            const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
            expect(tableData).to.eql(expectedDataFromQuery);
          });

          it('when the kql filters for united.endpoint.host.hostname, table shows 1 item', async () => {
            const expectedDataFromQuery = [...expectedData.slice(0, 2).map((row) => [...row])];
            const hostName = expectedDataFromQuery[1][0];
            const adminSearchBar = await testSubjects.find('adminSearchBar');
            await adminSearchBar.clearValueWithKeyboard();
            await adminSearchBar.type(
              `united.endpoint.host.hostname : "${hostName}" or host.hostname : "${hostName}" `
            );
            await testSubjects.click('querySubmitButton');
            await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
              'endpointListTable',
              1,
              90000
            );
            const tableData = await formattedTableData();
            expect(tableData.sort()).to.eql(expectedDataFromQuery.sort());
          });

          it('when the kql filters for multiple matches, table shows the correct items', async () => {
            const expectedDataFromQuery = [...expectedData.slice(0, 3).map((row) => [...row])];
            const adminSearchBar = await testSubjects.find('adminSearchBar');
            await adminSearchBar.clearValueWithKeyboard();
            await adminSearchBar.type(
              `united.endpoint.host.os.family : "windows" or host.os.family : "windows" `
            );
            await testSubjects.click('querySubmitButton');
            await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
              'endpointListTable',
              2,
              90000
            );
            const tableData = await formattedTableData();
            expect(tableData.sort()).to.eql(expectedDataFromQuery.sort());
          });
        });
        it('does not show the details flyout initially', async () => {
          await testSubjects.missingOrFail('endpointDetailsFlyout');
        });

        describe('when the hostname is clicked on,', () => {
          before(async () => {
            await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
              'endpointListTable',
              3,
              90000
            );
          });
          it('display the details flyout', async () => {
            await testSubjects.click('hostnameCellLink');
            await testSubjects.existOrFail('endpointDetailsFlyout');
          });

          it('updates the details flyout when a new hostname is selected from the list', async () => {
            // display flyout for the first endpoint in the list
            await (await testSubjects.findAll('hostnameCellLink'))[0].click();
            await testSubjects.existOrFail('endpointDetailsFlyoutTitle');
            const endpointDetailTitle0 = await testSubjects.getVisibleText(
              'endpointDetailsFlyoutTitle'
            );
            // select the 2nd endpoint in the endpoint list
            await (await testSubjects.findAll('hostnameCellLink'))[1].click();
            await pageObjects.endpoint.waitForVisibleTextToChange(
              'endpointDetailsFlyoutTitle',
              endpointDetailTitle0
            );
            const endpointDetailTitle1 = await testSubjects.getVisibleText(
              'endpointDetailsFlyoutTitle'
            );
            expect(endpointDetailTitle1).to.not.eql(endpointDetailTitle0);
          });

          it('has the same flyout info when the same hostname is selected', async () => {
            // display flyout for the first endpoint in the list
            await (await testSubjects.findAll('hostnameCellLink'))[1].click();
            await testSubjects.existOrFail('endpointDetailsFlyoutTitle');
            const endpointDetailTitleInitial = await testSubjects.getVisibleText(
              'endpointDetailsFlyoutTitle'
            );
            // select the same endpoint in the endpoint list
            await (await testSubjects.findAll('hostnameCellLink'))[1].click();
            await retry.waitForWithTimeout(
              'endpoint details flyout title to exist',
              1500,
              async () => {
                return (await testSubjects.getVisibleText('endpointDetailsFlyoutTitle')) !== '';
                expect(testSubjects.getVisibleText('endpointDetailsFlyoutTitle')).to.equal(
                  endpointDetailTitleInitial
                );
              }
            );
          });
        });
      });
    });
  });
};
