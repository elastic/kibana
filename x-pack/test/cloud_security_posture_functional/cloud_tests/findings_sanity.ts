/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');

  describe('Findings Page - Sanity Tests', function () {
    this.tags(['cloud_security_posture_ui_sanity']);
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;

    before(async () => {
      findings = pageObjects.findings;
      latestFindingsTable = pageObjects.findings.latestFindingsTable;
      await findings.navigateToLatestFindingsPage();
      await findings.waitForPluginInitialized();
    });

    describe('Findings - Querying data', () => {
      afterEach(async () => {
        // Reset the group selector to None
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        // Reset search query
        await queryBar.clearQuery();
        await queryBar.submitQuery();
      });

      const testCases = [
        {
          searchQuery:
            'cloud.provider : "aws" and cloud.region : "eu-west-3" and result.evaluation : "failed"  and rule.tags : "CIS 5.4"',
          provider: 'aws',
          expectedRowsCount: 3,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '3 findings',
        },
        {
          searchQuery:
            'cloud.provider : "gcp" and rule.benchmark.rule_number : "3.1" and result.evaluation : "failed"',
          provider: 'gcp',
          expectedRowsCount: 1,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '1 finding',
        },
        {
          searchQuery:
            'cloud.provider : "azure" and rule.benchmark.rule_number : "9.1" and result.evaluation : "failed"',
          provider: 'azure',
          expectedRowsCount: 1,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '1 finding',
        },
        {
          searchQuery:
            'rule.benchmark.id : "cis_k8s" and rule.benchmark.rule_number : "4.2.4" and result.evaluation : "failed"',
          provider: 'k8s',
          expectedRowsCount: 2,
          expectedGroupCount: '0 cloud accounts',
          expectedUnitCount: '2 findings',
        },
        {
          searchQuery: 'rule.benchmark.id : "cis_eks" and rule.benchmark.rule_number : "3.1.1"',
          provider: 'eks',
          expectedRowsCount: 2,
          expectedGroupCount: '0 cloud accounts',
          expectedUnitCount: '2 findings',
        },
      ];

      testCases.forEach(
        ({ searchQuery, provider, expectedRowsCount, expectedGroupCount, expectedUnitCount }) => {
          it(`Querying ${provider} provider data`, async () => {
            // Execute the query
            await queryBar.setQuery(searchQuery);
            await queryBar.submitQuery();
            // Get the number of rows in the data table
            const rowsCount = await findings
              .createDataTableObject('latest_findings_table')
              .getRowsCount();

            // Check that the number of rows matches the expected count
            expect(rowsCount).to.be(expectedRowsCount);
            const groupSelector = await findings.groupSelector();
            await groupSelector.openDropDown();
            await groupSelector.setValue('Cloud account');
            const grouping = await findings.findingsGrouping();
            // Check that the group count and unit count matches the expected values
            const groupCount = await grouping.getGroupCount();
            expect(groupCount).to.be(expectedGroupCount);

            const unitCount = await grouping.getUnitCount();
            expect(unitCount).to.be(expectedUnitCount);
          });
        }
      );
    });

    describe('Findings - Sorting data', () => {
      afterEach(async () => {
        const paginationBtn = await testSubjects.find('tablePaginationPopoverButton');
        await paginationBtn.click();
        const pageSizeOption = await testSubjects.find('tablePagination-50-rows');
        await pageSizeOption.click();
      });

      type SortDirection = 'asc' | 'desc';
      const paginationAndsortingTestCases: Array<{
        searchQuery: string;
        paginationRowsCount: string;
        columnName: string;
        sortType: SortDirection;
        expectedResult: string;
      }> = [
        {
          searchQuery:
            'cloud.provider : "aws" and resource.sub_type : "aws-iam-user" and result.evaluation : "passed"',
          paginationRowsCount: '250',
          columnName: 'rule.benchmark.rule_number',
          sortType: 'desc',
          expectedResult: '1.7',
        },
        {
          searchQuery: 'cloud.provider : "azure" and result.evaluation : "failed"',
          paginationRowsCount: '500',
          columnName: 'rule.benchmark.rule_number',
          sortType: 'asc',
          expectedResult: '1.23',
        },
        {
          searchQuery: 'cloud.provider : "gcp" and result.evaluation : "passed"',
          paginationRowsCount: '500',
          columnName: 'resource.sub_type',
          sortType: 'desc',
          expectedResult: 'gcp-storage-bucket',
        },
      ];

      paginationAndsortingTestCases.forEach(
        ({ searchQuery, paginationRowsCount, columnName, sortType, expectedResult }) => {
          it(`Paginating and sorting data`, async () => {
            // Run query
            await queryBar.clearQuery();
            await queryBar.setQuery(searchQuery);
            await queryBar.submitQuery();
            // Update latest findings table pagination
            const paginationBtn = await testSubjects.find('tablePaginationPopoverButton');
            await paginationBtn.click();
            const pageSizeOption = await testSubjects.find(
              `tablePagination-${paginationRowsCount}-rows`
            );
            await pageSizeOption.click();
            // Sort by column
            await latestFindingsTable.toggleColumnSort(columnName, sortType);
            await pageObjects.header.waitUntilLoadingHasFinished();
            const values = (await latestFindingsTable.getColumnValues(columnName)).filter(Boolean);
            // Check that the first value matches the expected result
            // Whole sorting logic functionality is checked in the findings.ts
            expect(values[0]).to.equal(expectedResult);
          });
        }
      );
    });
  });
};
