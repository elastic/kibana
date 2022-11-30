/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common', 'findings']);

  const data = Array.from({ length: 2 }, (_, id) => {
    return {
      resource: { id, name: `Resource ${id}` },
      result: { evaluation: 'passed' },
      rule: {
        name: `Rule ${id}`,
        section: 'Kubelet',
        tags: ['Kubernetes'],
        type: 'process',
        benchmark: {
          name: 'CIS Kubernetes V1.23',
          id: 'cis_k8s',
          version: 'v1.0.0',
        },
      },
    };
  });

  const ruleName1 = data[0].rule.name;
  const ruleName2 = data[1].rule.name;

  describe('Findings Page', () => {
    let findings: typeof pageObjects.findings;
    let table: typeof pageObjects.findings.table;
    let flyout: typeof pageObjects.findings.flyout;

    before(async () => {
      findings = pageObjects.findings;
      table = pageObjects.findings.table;
      flyout = pageObjects.findings.flyout;

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
        await filterBar.addFilter('rule.name', 'is', ruleName1);

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
      it('sorts by rule name', async () => {
        await table.toggleColumnSortOrFail('Rule', 'asc');
      });

      it('sorts by resource name', async () => {
        await table.toggleColumnSortOrFail('Resource Name', 'desc');
      });
    });

    describe.only('Flyout', () => {
      it('opens flyout', async () => {
        await flyout.openRowIndexFlyout(1);

        expect(await flyout.isFlyoutOpen()).to.be(true);
      });

      it('closes flyout', async () => {
        await flyout.closeFlyout();

        expect(await flyout.isFlyoutOpen()).to.be(false);
      });

      it('copies raw JSON to clipboard', async () => {
        await flyout.openRowIndexFlyout(1);
        await flyout.navigateToJSONTab();
        await flyout.copyJSONToClipboard();
        const name = JSON.parse(await browser.getClipboardValue()).rule.name;
        expect(name).to.eql(data[0].rule.name);
      });
    });
  });
}
