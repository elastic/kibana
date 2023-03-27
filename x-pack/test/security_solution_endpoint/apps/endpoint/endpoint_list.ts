/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../ftr_provider_context';

import {
  deleteMetadataStream,
  deleteAllDocsFromMetadataCurrentIndex,
  deleteAllDocsFromMetadataUnitedIndex,
} from '../../../security_solution_endpoint_api_int/apis/data_stream_helper';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');
  const endpointTestResources = getService('endpointTestResources');

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
      'Host-dpu1a2r2yi',
      'x',
      'x',
      'Warning',
      'Linux',
      '10.2.17.24, 10.56.215.200,10.254.196.130',
      'x',
      'x',
      '',
    ],
    [
      'Host-rs9wp4o6l9',
      'x',
      'x',
      'Success',
      'Linux',
      '10.138.79.131, 10.170.160.154',
      'x',
      'x',
      '',
    ],
    [
      'Host-u5jy6j0pwb',
      'x',
      'x',
      'Warning',
      'Linux',
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
    const sleep = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
    let indexedData: IndexedHostsAndAlertsResponse;
    describe('when initially navigating to page', () => {
      before(async () => {
        await deleteMetadataStream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
        await deleteAllDocsFromMetadataUnitedIndex(getService);
        await pageObjects.endpoint.navigateToEndpointList();
      });
      it('finds no data in list and prompts onboarding to add policy', async () => {
        await testSubjects.exists('emptyPolicyTable');
      });
    });

    describe('when there is data,', () => {
      before(async () => {
        indexedData = await endpointTestResources.loadEndpointData({ numHosts: 3 });
        await pageObjects.endpoint.navigateToEndpointList();
        await pageObjects.endpoint.waitForTableToHaveNumberOfEntries('endpointListTable', 3, 90000);
      });
      after(async () => {
        await deleteAllDocsFromMetadataCurrentIndex(getService);
        await deleteAllDocsFromMetadataUnitedIndex(getService);
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
          const querySubmitButton = await testSubjects.find('querySubmitButton');
          await adminSearchBar.clearValueWithKeyboard();
          await querySubmitButton.click();
        });
        it('when the kql query is `na`, table shows an empty list', async () => {
          const adminSearchBar = await testSubjects.find('adminSearchBar');
          await adminSearchBar.clearValueWithKeyboard();
          await adminSearchBar.type('na');
          const querySubmitButton = await testSubjects.find('querySubmitButton');
          await querySubmitButton.click();
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
          const querySubmitButton = await testSubjects.find('querySubmitButton');
          await querySubmitButton.click();
          await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
            'endpointListTable',
            1,
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
          await (await testSubjects.find('hostnameCellLink')).click();
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
          await sleep(500); // give page time to refresh and verify it did not change
          const endpointDetailTitleNew = await testSubjects.getVisibleText(
            'endpointDetailsFlyoutTitle'
          );
          expect(endpointDetailTitleNew).to.equal(endpointDetailTitleInitial);
        });
      });
    });
  });
};
