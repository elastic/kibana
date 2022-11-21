/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'findings']);
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * This is required prior to indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');

      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .expect(200);

      expect(response.body).to.eql({ initialized: true });

      log.debug('CSP plugin is initialized');
    });

  const indexFindings = async () =>
    Promise.all(
      Array.from({ length: 11 }, (_, id) => {
        // We only need to index fields that show up in table columns
        return es.index({
          index: FINDINGS_INDEX,
          body: {
            resource: { id },
            result: { evaluation: 'passed' },
            rule: {
              name: `Rule ${id}`,
              section: 'Kubelet',
              tags: ['Kubernetes'],
              type: 'process',
            },
          },
        });
      })
    );

  const removeFindingsIndex = async () => {
    try {
      await es.indices.delete({ index: FINDINGS_INDEX });
    } catch (e) {}
  };
  describe('Findings Page', () => {
    before(async () => {
      await removeFindingsIndex();
      await waitForPluginInitialized();
      await indexFindings();
      await pageObjects.findings.navigateToFindingsPage();
    });

    after(async () => {
      await removeFindingsIndex();
    });

    // Testing only a single column to verify the request we issue results in proper sorting
    describe('Sorting', () => {
      it('Sorts by rule name', async () => {
        await pageObjects.findings.toggleColumnSorting('Rule');
        await pageObjects.findings.assertColumnSorting('Rule', 'desc');
        await pageObjects.findings.toggleColumnSorting('Rule');
        await pageObjects.findings.assertColumnSorting('Rule', 'asc');
      });
    });

    // Testing only page numbers buttons to verify the request we issue results in proper paginating
    describe('Pagination', () => {
      it('Changes rows per page', async () => {
        await pageObjects.findings.assertPageSize(25);
        await pageObjects.findings.changePageSize(10);
        await pageObjects.findings.assertPageSize(10);
      });

      it('Navigates to next page', async () => {
        await pageObjects.findings.goToPageIndex(1);
        await pageObjects.findings.assertPageIndex(1);
      });

      it('Navigates to prev page', async () => {
        await pageObjects.findings.goToPageIndex(0);
        await pageObjects.findings.assertPageIndex(0);
      });
    });
  });
}
