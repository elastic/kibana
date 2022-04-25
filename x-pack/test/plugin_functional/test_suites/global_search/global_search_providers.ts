/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GlobalSearchResult } from '@kbn/global-search-plugin/common/types';
import { GlobalSearchTestApi } from '@kbn/global-search-test-plugin/public/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  const findResultsWithApi = async (t: string): Promise<GlobalSearchResult[]> => {
    return browser.executeAsync(async (term, cb) => {
      const { start } = window._coreProvider;
      const globalSearchTestApi: GlobalSearchTestApi = start.plugins.globalSearchTest;
      globalSearchTestApi.find(term).then(cb);
    }, t);
  };

  describe('GlobalSearch providers', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('globalSearchTestApp');
    });

    describe('SavedObject provider', function () {
      before(async () => {
        await esArchiver.load('x-pack/test/plugin_functional/es_archives/global_search/basic');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/plugin_functional/es_archives/global_search/basic');
      });

      it('can search for index patterns', async () => {
        const results = await findResultsWithApi('type:index-pattern logstash');
        expect(results.length).to.be(1);
        expect(results[0].type).to.be('index-pattern');
        expect(results[0].title).to.be('logstash-*');
        expect(results[0].score).to.be.greaterThan(0.9);
      });

      it('can search for visualizations', async () => {
        const results = await findResultsWithApi('type:visualization pie');
        expect(results.length).to.be(1);
        expect(results[0].type).to.be('visualization');
        expect(results[0].title).to.be('A Pie');
      });

      it('can search for maps', async () => {
        const results = await findResultsWithApi('type:map just');
        expect(results.length).to.be(1);
        expect(results[0].type).to.be('map');
        expect(results[0].title).to.be('just a map');
      });

      it('can search for dashboards', async () => {
        const results = await findResultsWithApi('type:dashboard Amazing');
        expect(results.length).to.be(1);
        expect(results[0].type).to.be('dashboard');
        expect(results[0].title).to.be('Amazing Dashboard');
      });

      it('returns all objects matching the search', async () => {
        const results = await findResultsWithApi('type:dashboard dashboard');
        expect(results.length).to.be(2);
        expect(results.map((r) => r.title)).to.contain('dashboard with map');
        expect(results.map((r) => r.title)).to.contain('Amazing Dashboard');
      });

      it('can search by prefix', async () => {
        const results = await findResultsWithApi('type:dashboard Amaz');
        expect(results.length).to.be(1);
        expect(results[0].type).to.be('dashboard');
        expect(results[0].title).to.be('Amazing Dashboard');
      });
    });

    describe('Applications provider', function () {
      it('can search for root-level applications', async () => {
        const results = await findResultsWithApi('discover');
        expect(results.length).to.be(1);
        expect(results[0].title).to.be('Discover');
      });

      it('can search for application deep links', async () => {
        const results = await findResultsWithApi('saved objects');
        expect(results.length).to.be(1);
        expect(results[0].title).to.be('Kibana / Saved Objects');
      });
    });
  });
}
