/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';
const STATUS_API_PATH = '/internal/cloud_security_posture/status?check=init';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const pageObjects = getPageObjects(['common', 'findings']);

  const FINDINGS_SIZE = 2;
  const findingsMock = Array.from({ length: FINDINGS_SIZE }, (_, id) => {
    return {
      resource: { id, name: `Resource ${id}` },
      result: { evaluation: 'passed' },
      rule: {
        name: `Rule ${id}`,
        section: 'Kubelet',
        tags: ['Kubernetes'],
        type: 'process',
      },
    };
  });

  const firstRuleName = findingsMock[0].rule.name;
  const secondRuleName = findingsMock[1].rule.name;

  describe('Findings Page', () => {
    before(async () => {
      await pageObjects.findings.index.add(findingsMock);
      await pageObjects.findings.navigateToFindingsPage();
    });

    after(async () => {
      await pageObjects.findings.index.remove();
    });

    describe('Sort', () => {
      it('Sorts by rule name', async () => {
        await pageObjects.findings.table.toggleColumnSortOrFail('Rule', 'asc');
      });

      it('Sorts by resource name', async () => {
        await pageObjects.findings.table.toggleColumnSortOrFail('Resource Name', 'desc');
      });
    });

    describe('Search', () => {
      it('add filter', async () => {
        await filterBar.addFilter('rule.name', 'is', firstRuleName);
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', firstRuleName);
        await pageObjects.findings.table.columnCellMissingOrFail('Rule', secondRuleName);
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('rule.name');
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', firstRuleName);
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', secondRuleName);
      });

      it('add cell value filter', async () => {
        await pageObjects.findings.table.addFilter('Rule', firstRuleName, false);
        await filterBar.hasFilter('rule.name', firstRuleName);
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', firstRuleName);
        await pageObjects.findings.table.columnCellMissingOrFail('Rule', secondRuleName);
      });

      it('add negated cell value filter', async () => {
        await pageObjects.findings.table.addFilter('Rule', firstRuleName, true);
        await filterBar.hasFilter('rule.name', firstRuleName, true, false, true);
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', secondRuleName);
        await pageObjects.findings.table.columnCellMissingOrFail('Rule', firstRuleName);

        await filterBar.removeFilter('rule.name');
      });

      it('set search query', async () => {
        await queryBar.setQuery(firstRuleName);
        await queryBar.submitQuery();
        await pageObjects.findings.table.columnCellExistsOrFail('Rule', firstRuleName);
      });
    });
  });
}
