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

      expect(response.body).to.eql({ isPluginInitialized: true });

      log.debug('CSP plugin is initialized');
    });

  const addFindingsIndex = async () => {
    await waitForPluginInitialized();
    await Promise.all(
      Array.from({ length: 11 }, (_, id) => {
        return es.index({
          index: FINDINGS_INDEX,
          body: {
            resource: { id, name: `Resource ${id}` },
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
  };

  const removeFindingsIndex = () =>
    es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true });

  describe('Findings Page', () => {
    before(async () => {
      await addFindingsIndex();
      await pageObjects.findings.navigateToFindingsPage();
    });

    after(async () => {
      await removeFindingsIndex();
    });

    describe('Sorting', () => {
      it('Sorts by rule name', async () => {
        await pageObjects.findings.toggleColumnSorting('Rule', 'asc');
        await pageObjects.findings.assertColumnSorting('Rule', 'asc');
      });

      it('Sorts by resource name', async () => {
        await pageObjects.findings.toggleColumnSorting('Resource Name', 'desc');
        await pageObjects.findings.assertColumnSorting('Resource Name', 'desc');
      });
    });

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
