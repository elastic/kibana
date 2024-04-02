/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { vulnerabilitiesLatestMock } from '../mocks/vulnerabilities_latest_mock';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);

  const resourceName1 = 'name-ng-1-Node';
  const resourceName2 = 'othername-june12-8-8-0-1';

  const cloudAccountName1 = 'elastic-security-cloud-security-dev';
  const cloudAccountName2 = 'elastic-security-cloud-security-gcp';

  const cloudProviderName1 = 'Amazon Web Services';
  const cloudProviderName2 = 'Google Cloud Platform';

  describe('Vulnerabilities Page - Grouping', function () {
    this.tags(['cloud_security_posture_findings_grouping']);
    let findings: typeof pageObjects.findings;

    before(async () => {
      findings = pageObjects.findings;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();

      // Prepare mocked findings
      await findings.vulnerabilitiesIndex.remove();
      await findings.vulnerabilitiesIndex.add(vulnerabilitiesLatestMock);

      await findings.navigateToLatestVulnerabilitiesPage();
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await findings.vulnerabilitiesIndex.remove();
    });

    describe('Default Grouping', async () => {
      it('groups vulnerabilities by cloud account and sort by number of vulnerabilities desc', async () => {
        const groupSelector = findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('Cloud account');

        const grouping = await findings.findingsGrouping();

        const order = [
          {
            cloudAccountName: cloudAccountName1,
            cloudProviderName: cloudProviderName1,
            findingsCount: '1',
          },
          {
            cloudAccountName: cloudAccountName2,
            cloudProviderName: cloudProviderName2,
            findingsCount: '1',
          },
        ];

        await asyncForEach(
          order,
          async ({ cloudAccountName, cloudProviderName, findingsCount }, index) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(cloudAccountName);
            expect(await groupRow.getVisibleText()).to.contain(cloudProviderName);

            expect(
              await (
                await groupRow.findByTestSubject('vulnerabilities_grouping_counter')
              ).getVisibleText()
            ).to.be(findingsCount);
          }
        );

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 cloud accounts');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('2 vulnerabilities');
      });
      it('groups vulnerabilities by CVE and sort by number of vulnerabilities desc', async () => {
        const groupSelector = findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('CVE');

        const grouping = await findings.findingsGrouping();

        const order = [
          {
            name: vulnerabilitiesLatestMock[0].vulnerability.id,
            description: vulnerabilitiesLatestMock[0].vulnerability.description,
            findingsCount: '1',
          },
          {
            name: vulnerabilitiesLatestMock[1].vulnerability.id,
            description: vulnerabilitiesLatestMock[1].vulnerability.description,
            findingsCount: '1',
          },
        ];

        await asyncForEach(order, async ({ name, description, findingsCount }, index) => {
          const groupRow = await grouping.getRowAtIndex(index);
          expect(await groupRow.getVisibleText()).to.contain(name);
          expect(await groupRow.getVisibleText()).to.contain(description);

          expect(
            await (
              await groupRow.findByTestSubject('vulnerabilities_grouping_counter')
            ).getVisibleText()
          ).to.be(findingsCount);
        });

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 CVEs');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('2 vulnerabilities');
      });
      it('groups vulnerabilities by resource and sort by number of vulnerabilities desc', async () => {
        const groupSelector = findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');
        const grouping = await findings.findingsGrouping();

        const resourceOrder = [
          {
            resourceName: resourceName1,
            resourceId: vulnerabilitiesLatestMock[0].resource.id,
            findingsCount: '1',
          },
          {
            resourceName: resourceName2,
            resourceId: vulnerabilitiesLatestMock[1].resource.id,
            findingsCount: '1',
          },
        ];

        await asyncForEach(
          resourceOrder,
          async ({ resourceName, resourceId, findingsCount }, index) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(resourceName);
            expect(await groupRow.getVisibleText()).to.contain(resourceId);
            expect(
              await (
                await groupRow.findByTestSubject('vulnerabilities_grouping_counter')
              ).getVisibleText()
            ).to.be(findingsCount);
          }
        );

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 resources');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('2 vulnerabilities');
      });
    });

    // Skipped: tests involving DataView works when running this file on isolation but fails when running all tests
    // TODO: Discover why it fails when running all tests
    describe.skip('SearchBar', () => {
      it('add filter', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');

        // Filter bar uses the field's customLabel in the DataView

        await filterBar.addFilter({
          field: 'Resource Name',
          operation: 'is',
          value: resourceName1,
        });
        expect(await filterBar.hasFilter('resource.name', resourceName1)).to.be(true);

        const grouping = await findings.findingsGrouping();

        const groupRow = await grouping.getRowAtIndex(0);
        expect(await groupRow.getVisibleText()).to.contain(resourceName1);

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 resource');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 vulnerability');
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('resource.name');

        expect(await filterBar.hasFilter('resource.name', resourceName1)).to.be(false);

        const grouping = await findings.findingsGrouping();
        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 resources');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('2 vulnerabilities');
      });

      it('set search query', async () => {
        await queryBar.setQuery(resourceName1);
        await queryBar.submitQuery();

        const grouping = await findings.findingsGrouping();

        const groupRow = await grouping.getRowAtIndex(0);
        expect(await groupRow.getVisibleText()).to.contain(resourceName1);

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 resource');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 vulnerability');

        await queryBar.setQuery('');
        await queryBar.submitQuery();

        expect(await grouping.getGroupCount()).to.be('2 resources');
        expect(await grouping.getUnitCount()).to.be('2 vulnerabilities');
      });
    });

    describe('Group table', async () => {
      it('shows vulnerabilities table when expanding', async () => {
        const grouping = await findings.findingsGrouping();
        const firstRow = await grouping.getRowAtIndex(0);
        await (await firstRow.findByCssSelector('button')).click();
        const latestFindingsTable = findings.createDataTableObject('latest_vulnerabilities_table');
        expect(await latestFindingsTable.getRowsCount()).to.be(1);
        expect(await latestFindingsTable.hasColumnValue('resource.name', resourceName1)).to.be(
          true
        );
      });
    });
  });
}
