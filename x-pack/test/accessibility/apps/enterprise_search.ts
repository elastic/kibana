/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { common } = getPageObjects(['common']);
  const kibanaServer = getService('kibanaServer');

  describe('Enterprise Search Accessibility', () => {
    // NOTE: These accessibility tests currently only run against Enterprise Search in Kibana
    // without a sidecar Enterprise Search service/host configured, and as such only test
    // the basic setup guides and not the full application(s)
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Overview', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/overview');
      });

      it('loads a landing page with product cards', async function () {
        await retry.waitFor(
          'Elasticsearch product card visible',
          async () => await testSubjects.exists('elasticsearchProductCard')
        );
        await retry.waitFor(
          'Search Applications product card visible',
          async () => await testSubjects.exists('enterpriseSearchApplicationsProductCard')
        );
        await retry.waitFor(
          'Behavioral Analytics product card visible',
          async () => await testSubjects.exists('enterpriseSearchAnalyticsProductCard')
        );
        await a11y.testAppSnapshot();
      });

      it('loads a setup guide', async function () {
        await testSubjects.click('setupGuideLink');
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Content', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/content/search_indices');
      });

      it('loads the indices page', async function () {
        await retry.waitFor(
          'create index button visible',
          async () => await testSubjects.exists('entSearchContent-searchIndices-createButton')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Elasticsearch', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/elasticsearch');
      });

      it('loads a setup guide', async function () {
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('elasticsearchGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('App Search', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/app_search');
      });

      it('loads a setup guide', async function () {
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Workplace Search', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/workplace_search');
      });

      it('loads a setup guide', async function () {
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Search Applications', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/applications');
      });

      it('loads search applications list', async function () {
        await retry.waitFor(
          'search apps docs link',
          async () => await testSubjects.exists('search-applications-documentation-link')
        );
        await a11y.testAppSnapshot();
      });
    });
    describe('Behavioral Analytics', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/analytics');
      });

      it('loads Behavioral Analytics page', async function () {
        await retry.waitFor(
          'create collections button',
          async () => await testSubjects.exists('create-analytics-collection-btn')
        );
        await a11y.testAppSnapshot();
      });
    });
    describe('Vector Search', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/vector_search');
      });

      it('loads Vector Search page', async function () {
        await retry.waitFor(
          'vector search documentation link',
          async () => await testSubjects.exists('vector-search-documentation-link')
        );
        await a11y.testAppSnapshot();
      });
    });
    describe('ESRE', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/esre');
      });

      it('loads ESRE page', async function () {
        await retry.waitFor(
          'esre header description',
          async () => await testSubjects.exists('esre-description-text')
        );
        await a11y.testAppSnapshot();
      });
    });
  });
}
