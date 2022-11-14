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
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'findings']);
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * This is required prior to indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');

      const response = await supertest
        .get('/internal/cloud_security_posture/status?check_initialized=true')
        .expect(200);

      expect(response.body).to.eql({ initialized: true });

      log.debug('CSP plugin is initialized');
    });

  describe('Findings Page', () => {
    before(async () => {
      await waitForPluginInitialized();
      await esArchiver.load('x-pack/test/functional/es_archives/findings');
      await pageObjects.findings.navigateToFindingsPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/findings');
    });

    // Testing only page numbers buttons to verify the request we issue results in proper paginating
    describe('Pagination', () => {
      it('Navigates to next page', async () => {
        await pageObjects.findings.goToPageIndex(1);
        await pageObjects.findings.assertPageIndex(1);
      });

      it('Navigates to prev page', async () => {
        await pageObjects.findings.goToPageIndex(0);
        await pageObjects.findings.assertPageIndex(0);
      });

      it('Changes rows per page', async () => {
        await pageObjects.findings.assertPageSize(10);
        await pageObjects.findings.changePageSize(25);
        await pageObjects.findings.assertPageSize(25);
        await pageObjects.findings.changePageSize(10); // revert
      });
    });

    // Testing only a single column to verify the request we issue results in proper sorting
    describe('Sorting', () => {
      it('Sorts by rule name', async () => {
        await pageObjects.findings.assertNameColumnSorting('asc');
        await pageObjects.findings.toggleNameColumnSorting();
        await pageObjects.findings.assertNameColumnSorting('desc');
      });
    });
  });
}
