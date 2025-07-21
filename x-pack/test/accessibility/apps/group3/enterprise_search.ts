/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

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

    describe('Home', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/home');
      });

      it('loads the search home page', async function () {
        await testSubjects.exists('search-homepage');
      });
    });

    describe('Index Management', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/index_management/indices');
      });

      it('loads the indices page', async function () {
        await retry.waitFor(
          'create index button visible',
          async () => await testSubjects.exists('createIndexButton')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Playground', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/applications');
      });

      it('loads playground', async function () {
        await retry.waitFor(
          'playground docs link',
          async () => await testSubjects.exists('playground-documentation-link')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Search Applications', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/applications/search_applications');
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
        await common.navigateToApp('elasticsearch/analytics');
      });

      it('loads Behavioral Analytics page', async function () {
        await retry.waitFor(
          'create collections button',
          async () => await testSubjects.exists('create-analytics-collection-btn')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Search Synonyms', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/synonyms');
      });

      it('loads Synonyms page', async function () {
        await retry.waitFor(
          'synonyms docs link',
          async () => await testSubjects.exists('searchSynonymsEmptyPromptFooterLink')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Search Inference endpoints', () => {
      before(async () => {
        await common.navigateToApp('elasticsearch/relevance/inference_endpoints');
      });

      it('loads Inference endpoints page', async function () {
        await retry.waitFor(
          'Inference endpoints page header',
          async () => await testSubjects.exists('allInferenceEndpointsPage')
        );
        await a11y.testAppSnapshot();
      });
    });
  });
}
