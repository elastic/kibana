/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import {
  deleteMetadataStream,
  deleteAllDocsFromMetadataCurrentIndex,
} from '../../../security_solution_endpoint_api_int/apis/data_stream_helper';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint', 'header', 'endpointPageUtils']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  const expectedData = [
    [
      'Hostname',
      'Agent Status',
      'Integration Policy',
      'Policy Status',
      'Operating System',
      'IP Address',
      'Version',
      'Last Active',
      'Actions',
    ],
    [
      'rezzani-7.example.com',
      'Error',
      'Default',
      'Failure',
      'windows 10.0',
      '10.101.149.26, 2606:a000:ffc0:39:11ef:37b9:3371:578c',
      '6.8.0',
      'Jan 24, 2020 @ 16:06:09.541',
      '',
    ],
    [
      'cadmann-4.example.com',
      'Error',
      'Default',
      'Failure',
      'windows 10.0',
      '10.192.213.130, 10.70.28.129',
      '6.6.1',
      'Jan 24, 2020 @ 16:06:09.541',
      '',
    ],
    [
      'thurlow-9.example.com',
      'Error',
      'Default',
      'Success',
      'windows 10.0',
      '10.46.229.234',
      '6.0.0',
      'Jan 24, 2020 @ 16:06:09.541',
      '',
    ],
  ];

  describe('endpoint list', function () {
    this.tags('ciGroup7');
    const sleep = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

    describe('when initially navigating to page', () => {
      before(async () => {
        await deleteMetadataStream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
        await pageObjects.endpoint.navigateToEndpointList();
      });
      after(async () => {
        await deleteMetadataStream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
      });

      it('finds no data in list and prompts onboarding to add policy', async () => {
        await testSubjects.exists('emptyPolicyTable');
      });

      it('finds data after load and polling', async () => {
        await esArchiver.load('endpoint/metadata/destination_index', { useCreate: true });
        await pageObjects.endpoint.waitForTableToHaveData('endpointListTable', 1100);
        const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
        expect(tableData).to.eql(expectedData);
      });
    });

    describe('when there is data,', () => {
      before(async () => {
        await esArchiver.load('endpoint/metadata/destination_index', { useCreate: true });
        await pageObjects.endpoint.navigateToEndpointList();
      });
      after(async () => {
        await deleteMetadataStream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
      });

      it('finds page title', async () => {
        const title = await testSubjects.getVisibleText('header-page-title');
        expect(title).to.equal('Endpoints');
      });

      it('displays table data', async () => {
        const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
        expect(tableData).to.eql(expectedData);
      });

      it('does not show the details flyout initially', async () => {
        await testSubjects.missingOrFail('endpointDetailsFlyout');
      });

      describe('when the hostname is clicked on,', () => {
        it('display the details flyout', async () => {
          await (await testSubjects.find('hostnameCellLink')).click();
          await testSubjects.existOrFail('endpointDetailsUpperList');
          await testSubjects.existOrFail('endpointDetailsLowerList');
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

      // This set of tests fails the flyout does not open in the before() and will be fixed in soon
      describe.skip("has a url with an endpoint host's id", () => {
        before(async () => {
          await pageObjects.endpoint.navigateToEndpointList(
            'selected_endpoint=3838df35-a095-4af4-8fce-0b6d78793f2e'
          );
        });

        it('shows a flyout', async () => {
          await testSubjects.existOrFail('endpointDetailsFlyoutBody');
          await testSubjects.existOrFail('endpointDetailsUpperList');
          await testSubjects.existOrFail('endpointDetailsLowerList');
        });

        it('displays details row headers', async () => {
          const expectedHeaders = [
            'OS',
            'Last Seen',
            'Alerts',
            'Integration Policy',
            'Policy Status',
            'IP Address',
            'Hostname',
            'Sensor Version',
          ];
          const keys = await pageObjects.endpoint.endpointFlyoutDescriptionKeys(
            'endpointDetailsFlyout'
          );
          expect(keys).to.eql(expectedHeaders);
        });

        it('displays details row descriptions', async () => {
          const values = await pageObjects.endpoint.endpointFlyoutDescriptionValues(
            'endpointDetailsFlyout'
          );

          expect(values).to.eql([
            'Windows 10',
            '',
            '0',
            'Default',
            'Unknown',
            '10.101.149.262606:a000:ffc0:39:11ef:37b9:3371:578c',
            'rezzani-7.example.com',
            '6.8.0',
          ]);
        });
      });
    });

    describe('displays the correct table data for the kql queries', () => {
      before(async () => {
        await esArchiver.load('endpoint/metadata/destination_index', { useCreate: true });
        await pageObjects.endpoint.navigateToEndpointList();
      });
      after(async () => {
        await deleteMetadataStream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
      });
      it('for the kql query: na, table shows an empty list', async () => {
        const adminSearchBar = await testSubjects.find('adminSearchBar');
        await adminSearchBar.clearValueWithKeyboard();
        await adminSearchBar.type('na');
        const querySubmitButton = await testSubjects.find('querySubmitButton');
        await querySubmitButton.click();
        const expectedDataFromQuery = [
          [
            'Hostname',
            'Agent Status',
            'Integration Policy',
            'Policy Status',
            'Operating System',
            'IP Address',
            'Version',
            'Last Active',
            'Actions',
          ],
          ['No items found'],
        ];

        await pageObjects.endpoint.waitForTableToNotHaveData('endpointListTable');
        const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
        expect(tableData).to.eql(expectedDataFromQuery);
      });
      it('for the kql query: HostDetails.Endpoint.policy.applied.id : "C2A9093E-E289-4C0A-AA44-8C32A414FA7A", table shows 2 items', async () => {
        const adminSearchBar = await testSubjects.find('adminSearchBar');
        await adminSearchBar.clearValueWithKeyboard();
        await adminSearchBar.type(
          'HostDetails.Endpoint.policy.applied.id : "C2A9093E-E289-4C0A-AA44-8C32A414FA7A" '
        );
        const querySubmitButton = await testSubjects.find('querySubmitButton');
        await querySubmitButton.click();
        const expectedDataFromQuery = [
          [
            'Hostname',
            'Agent Status',
            'Integration Policy',
            'Policy Status',
            'Operating System',
            'IP Address',
            'Version',
            'Last Active',
            'Actions',
          ],
          [
            'cadmann-4.example.com',
            'Error',
            'Default',
            'Failure',
            'windows 10.0',
            '10.192.213.130, 10.70.28.129',
            '6.6.1',
            'Jan 24, 2020 @ 16:06:09.541',
            '',
          ],
          [
            'thurlow-9.example.com',
            'Error',
            'Default',
            'Success',
            'windows 10.0',
            '10.46.229.234',
            '6.0.0',
            'Jan 24, 2020 @ 16:06:09.541',
            '',
          ],
        ];
        await pageObjects.endpoint.waitForTableToHaveData('endpointListTable');
        const tableData = await pageObjects.endpointPageUtils.tableData('endpointListTable');
        expect(tableData).to.eql(expectedDataFromQuery);
      });
    });
  });
};
