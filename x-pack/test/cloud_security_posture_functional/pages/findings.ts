/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'findings']);
  const chance = new Chance();

  // We need to use a dataset for the tests to run
  // We intentionally make some fields start with a capital letter to test that the query bar is case-insensitive/case-sensitive
  const data = [
    {
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        benchmark: {
          id: 'cis_k8s',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        name: 'Upper case rule name',
        section: 'Upper case section',
        tags: ['Kubernetes'],
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
    {
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        benchmark: {
          id: 'cis_k8s',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        name: 'lower case rule name',
        section: 'Another upper case section',
        tags: ['Kubernetes'],
        type: 'process',
      },
      cluster_id: 'Another Upper case cluster id',
    },
    {
      resource: { id: chance.guid(), name: `process`, sub_type: 'another lower case type' },
      result: { evaluation: 'passed' },
      rule: {
        benchmark: {
          id: 'cis_k8s',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        name: 'Another upper case rule name',
        section: 'lower case section',
        tags: ['Kubernetes'],
        type: 'process',
      },
      cluster_id: 'lower case cluster id',
    },
    {
      resource: { id: chance.guid(), name: `process another`, sub_type: 'Upper case type again' },
      result: { evaluation: 'failed' },
      rule: {
        benchmark: {
          id: 'cis_k8s',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        name: 'some lower case rule name',
        section: 'another lower case section',
        tags: ['Kubernetes'],
        type: 'process',
      },
      cluster_id: 'another lower case cluster id',
    },
  ];

  const ruleName1 = data[0].rule.name;
  const ruleName2 = data[1].rule.name;

  describe('Findings Page', () => {
    let findings: typeof pageObjects.findings;
    let table: typeof pageObjects.findings.table;
    let tableGroupBy: typeof pageObjects.findings.tableGroupBy;
    let distributionBar: typeof pageObjects.findings.distributionBar;

    before(async () => {
      findings = pageObjects.findings;
      table = pageObjects.findings.table;
      tableGroupBy = pageObjects.findings.tableGroupBy;
      distributionBar = pageObjects.findings.distributionBar;

      await findings.index.add(data);
      await findings.navigateToFindingsPage();
      await retry.waitFor(
        'Findings table to be loaded',
        async () => (await table.getRowsCount()) === data.length
      );
    });

    after(async () => {
      await findings.index.remove();
    });

    describe('SearchBar', () => {
      it('add filter', async () => {
        await filterBar.addFilter({ field: 'rule.name', operation: 'is', value: ruleName1 });

        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(true);
        expect(await table.hasColumnValue('Rule', ruleName1)).to.be(true);
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('rule.name');

        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(false);
        expect(await table.getRowsCount()).to.be(data.length);
      });

      it('set search query', async () => {
        await queryBar.setQuery(ruleName1);
        await queryBar.submitQuery();

        expect(await table.hasColumnValue('Rule', ruleName1)).to.be(true);
        expect(await table.hasColumnValue('Rule', ruleName2)).to.be(false);

        await queryBar.setQuery('');
        await queryBar.submitQuery();

        expect(await table.getRowsCount()).to.be(data.length);
      });
    });

    describe('Table Filters', () => {
      it('add cell value filter', async () => {
        await table.addCellFilter('Rule', ruleName1, false);

        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(true);
        expect(await table.hasColumnValue('Rule', ruleName1)).to.be(true);
      });

      it('add negated cell value filter', async () => {
        await table.addCellFilter('Rule', ruleName1, true);

        expect(await filterBar.hasFilter('rule.name', ruleName1, true, false, true)).to.be(true);
        expect(await table.hasColumnValue('Rule', ruleName1)).to.be(false);
        expect(await table.hasColumnValue('Rule', ruleName2)).to.be(true);

        await filterBar.removeFilter('rule.name');
      });
    });

    describe('Table Sort', () => {
      type SortingMethod = (a: string, b: string) => number;
      type SortDirection = 'asc' | 'desc';
      // Sort by lexical order will sort by the first character of the string (case-sensitive)
      const compareStringByLexicographicOrder = (a: string, b: string) => {
        return a > b ? 1 : b > a ? -1 : 0;
      };
      const sortByAlphabeticalOrder = (a: string, b: string) => {
        return a.localeCompare(b);
      };

      it('sorts by a column, should be case sensitive/insensitive depending on the column', async () => {
        type TestCase = [string, SortDirection, SortingMethod];
        const testCases: TestCase[] = [
          ['CIS Section', 'asc', sortByAlphabeticalOrder],
          ['CIS Section', 'desc', sortByAlphabeticalOrder],
          ['Cluster ID', 'asc', compareStringByLexicographicOrder],
          ['Cluster ID', 'desc', compareStringByLexicographicOrder],
          ['Resource Name', 'asc', sortByAlphabeticalOrder],
          ['Resource Name', 'desc', sortByAlphabeticalOrder],
          ['Resource Type', 'asc', sortByAlphabeticalOrder],
          ['Resource Type', 'desc', sortByAlphabeticalOrder],
        ];
        for (const [columnName, dir, sortingMethod] of testCases) {
          await table.toggleColumnSort(columnName, dir);
          const values = (await table.getColumnValues(columnName)).filter(Boolean);
          expect(values).to.not.be.empty();

          const sorted = values
            .slice()
            .sort((a, b) => (dir === 'asc' ? sortingMethod(a, b) : sortingMethod(b, a)));
          values.forEach((value, i) => expect(value).to.be(sorted[i]));
        }
      });
    });

    describe('DistributionBar', () => {
      (['passed', 'failed'] as const).forEach((type) => {
        it(`filters by ${type} findings`, async () => {
          await distributionBar.filterBy(type);

          const items = data.filter(({ result }) => result.evaluation === type);
          expect(await table.getFindingsCount(type)).to.eql(items.length);

          await filterBar.removeFilter('result.evaluation');
        });
      });
    });

    describe('Group By', () => {
      it('Group by Resource', async () => {
        await table.toggleDropDownModal();
        await table.selectGroupBy('Resource');
        /* Findings by resource table has no Rule column */
        expect(await tableGroupBy.hasColumnName('Rule')).to.be(false);
      });

      it('Clicking on resource id navigates user to different table', async () => {
        for (let outerCounter = 0; outerCounter < data.length; outerCounter++) {
          await tableGroupBy.clickOnRowValue(
            data[outerCounter].resource.id,
            data[outerCounter].rule.section
          );
          /* resource_findings table has no Resource ID, Resource Type, Resource Name column */
          expect(await tableGroupBy.hasColumnName('Resource ID')).to.be(false);
          expect(await tableGroupBy.hasColumnName('Resource Type')).to.be(false);
          expect(await tableGroupBy.hasColumnName('Resource Name')).to.be(false);
          /* checks if the table title is correct  */
          expect(
            await tableGroupBy.hasText(`${data[outerCounter].resource.name} - Findings`)
          ).to.be(true);
          for (let innerCounter = 0; innerCounter < data.length; innerCounter++) {
            if (innerCounter === outerCounter)
              expect(await tableGroupBy.hasColumnValue('Rule', data[innerCounter].rule.name)).to.be(
                true
              );
            else
              expect(await tableGroupBy.hasColumnValue('Rule', data[innerCounter].rule.name)).to.be(
                false
              );
          }
          await tableGroupBy.clickBasedOnText('Back to resources');
          /* Make sure user is back to findings main page + also works as a little delay to allow the page to load completely */
          expect(await tableGroupBy.hasColumnValue('Resource Name', data[1].resource.name)).to.be(
            true
          );
        }
      });

      it('Using query on resource_findings table', async () => {
        await queryBar.setQuery(data[1].rule.name);
        await queryBar.submitQuery();
        expect(await tableGroupBy.hasColumnValue('Resource Name', data[1].resource.name)).to.be(
          true
        );
        expect(await tableGroupBy.hasColumnName('Rule')).to.be(false);
        expect(await tableGroupBy.hasColumnName('Resource ID')).to.be(true);
        expect(await tableGroupBy.hasColumnName('Resource Type')).to.be(true);
        expect(await tableGroupBy.hasColumnName('Resource Name')).to.be(true);
      });
    });
  });
}
