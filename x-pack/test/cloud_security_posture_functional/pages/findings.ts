/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
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
        await pageObjects.findings.table.toggleColumnSorting('Rule', 'asc');
        await pageObjects.findings.table.assertColumnSorting('Rule', 'asc');
      });

      it('Sorts by resource name', async () => {
        await pageObjects.findings.table.toggleColumnSorting('Resource Name', 'desc');
        await pageObjects.findings.table.assertColumnSorting('Resource Name', 'desc');
      });
    });
  });
}
