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
  const numberOfFindings = 10;
  const chance = new Chance();

  const data = Array.from({ length: numberOfFindings }, (_, id) => {
    return {
      resource: { id, name: `Resource ${id}` },
      result: { evaluation: id === 0 ? 'passed' : 'failed' },
      rule: {
        name: `Rule ${id}`,
        section: chance.string({ pool: 'abcdefghABCDEFGH', length: 10 }),
        tags: ['Kubernetes'],
        type: 'process',
      },
    };
  });

  const ruleName1 = data[0].rule.name;
  const ruleName2 = data[1].rule.name;

  // Failing: See https://github.com/elastic/kibana/issues/147998
  describe('Findings Page', () => {
    let findings: typeof pageObjects.findings;
    let table: typeof pageObjects.findings.table;
    let distributionBar: typeof pageObjects.findings.distributionBar;

    before(async () => {
      findings = pageObjects.findings;
      table = pageObjects.findings.table;
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
      it('sorts by a column, should be case sensitive/insensitive depending on the column', async () => {
        type SortDirection = 'asc' | 'desc';
        type TestCase = [string, string, SortDirection, Intl.CollatorOptions];
        const testCases: TestCase[] = [
          ['Rule', 'en', 'asc', {}],
          ['Rule', 'en', 'desc', {}],
          ['Resource Name', 'en', 'asc', {}],
          ['Resource Name', 'en', 'desc', {}],
          ['CIS Section', 'en', 'desc', { sensitivity: 'base' }],
          ['CIS Section', 'en', 'desc', { sensitivity: 'base' }],
        ];
        for (const [columnName, locale, dir, sortingOptions] of testCases) {
          await table.toggleColumnSort(columnName, dir);
          const values = (await table.getColumnValues(columnName)).filter(Boolean);
          expect(values).to.not.be.empty();
          const sorted = values
            .slice()
            .sort((a, b) =>
              dir === 'asc'
                ? a.localeCompare(b, locale, sortingOptions)
                : b.localeCompare(a, locale, sortingOptions)
            );
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
  });
}
