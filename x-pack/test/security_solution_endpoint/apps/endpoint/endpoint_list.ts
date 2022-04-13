/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import {
  deleteMetadataStream,
  deleteAllDocsFromMetadataCurrentIndex,
  deleteAllDocsFromMetadataUnitedIndex,
} from '../../../security_solution_endpoint_api_int/apis/data_stream_helper';
import { IndexedHostsAndAlertsResponse } from '../../../../plugins/security_solution/common/endpoint/index_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const endpointTestResources = getService('endpointTestResources');
  const policyTestResources = getService('policyTestResources');

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
    ['Host-9fafsc3tqe', 'x', 'x', 'Warning', 'Windows', '10.231.117.28', '7.17.12', 'x', ''],
    [
      'Host-ku5jy6j0pw',
      'x',
      'x',
      'Warning',
      'Windows',
      '10.246.87.11, 10.145.117.106,10.109.242.136',
      '7.0.13',
      'x',
      '',
    ],
    [
      'Host-o07wj6uaa5',
      'x',
      'x',
      'Failure',
      'Windows',
      '10.82.134.220, 10.47.25.170',
      '7.11.13',
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
        const endpointPackage = await policyTestResources.getEndpointPackage();
        await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
        indexedData = await endpointTestResources.loadEndpointData({ numHosts: 3 });
        await pageObjects.endpoint.navigateToEndpointList();
        await pageObjects.endpoint.waitForTableToHaveNumberOfEntries('endpointListTable', 3, 90000);
      });
      after(async () => {
        await deleteAllDocsFromMetadataCurrentIndex(getService);
        await deleteAllDocsFromMetadataUnitedIndex(getService);
        await endpointTestResources.unloadEndpointData(indexedData);
      });

      it('finds page title', async () => {
        const title = await testSubjects.getVisibleText('header-page-title');
        expect(title).to.equal('Endpoints');
      });

      it('displays table data', async () => {
        const tableData = await formattedTableData();
        expect(tableData.sort()).to.eql(expectedData.sort());
      });

      it('does not show the details flyout initially', async () => {
        await testSubjects.missingOrFail('endpointDetailsFlyout');
      });

      describe('when the hostname is clicked on,', () => {
        it('display the details flyout', async () => {
          await (await testSubjects.find('hostnameCellLink')).click();
          await testSubjects.existOrFail('endpointDetailsList');
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

        it('for the kql query: na, table shows an empty list', async () => {
          await pageObjects.endpoint.navigateToEndpointList();
          await browser.refresh();
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

          await pageObjects.endpoint.waitForTableToNotHaveData('endpointListTable');
          const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
          expect(tableData).to.eql(expectedDataFromQuery);
        });

        it('for the kql filtering for united.endpoint.host.hostname : "Host-ku5jy6j0pw", table shows 1 item', async () => {
          const adminSearchBar = await testSubjects.find('adminSearchBar');
          await adminSearchBar.clearValueWithKeyboard();
          await adminSearchBar.type(
            'united.endpoint.host.hostname : "Host-ku5jy6j0pw" or host.hostname : "Host-ku5jy6j0pw" '
          );
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
            [
              'Host-ku5jy6j0pw',
              'x',
              'x',
              'Warning',
              'Windows',
              '10.246.87.11, 10.145.117.106,10.109.242.136',
              '7.0.13',
              'x',
              '',
            ],
          ];
          await pageObjects.endpoint.waitForTableToHaveNumberOfEntries(
            'endpointListTable',
            1,
            90000
          );
          const tableData = await formattedTableData();
          expect(tableData.sort()).to.eql(expectedDataFromQuery.sort());
        });
      });
    });
  });
};
