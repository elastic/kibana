/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { GlobalSearchResult } from '../../../../plugins/global_search/common/types';
import { GlobalSearchTestApi } from '../../plugins/global_search_test/public/types';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  const findResultsWithAPI = async (t: string): Promise<GlobalSearchResult[]> => {
    return browser.executeAsync(async (term, cb) => {
      const { start } = window.__coreProvider;
      const globalSearchTestApi: GlobalSearchTestApi = start.plugins.globalSearchTest;
      globalSearchTestApi.findReal(term).then(cb);
    }, t);
  };

  describe('GlobalSearch - SavedObject provider', function () {
    before(async () => {
      await esArchiver.load('global_search/basic');
    });

    after(async () => {
      await esArchiver.unload('global_search/basic');
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('globalSearchTestApp');
    });

    it('can search for index patterns', async () => {
      const results = await findResultsWithAPI('logstash');
      expect(results.length).to.be(1);
      expect(results[0].type).to.be('index-pattern');
      expect(results[0].title).to.be('logstash-*');
      expect(results[0].score).to.be.greaterThan(1);
    });

    it('can search for visualizations', async () => {
      const results = await findResultsWithAPI('pie');
      expect(results.length).to.be(1);
      expect(results[0].type).to.be('visualization');
      expect(results[0].title).to.be('A Pie');
    });

    it('can search for maps', async () => {
      const results = await findResultsWithAPI('just');
      expect(results.length).to.be(1);
      expect(results[0].type).to.be('map');
      expect(results[0].title).to.be('just a map');
    });

    it('can search for dashboards', async () => {
      const results = await findResultsWithAPI('Amazing');
      expect(results.length).to.be(1);
      expect(results[0].type).to.be('dashboard');
      expect(results[0].title).to.be('Amazing Dashboard');
    });

    it('returns all objects matching the search', async () => {
      const results = await findResultsWithAPI('dashboard');
      expect(results.length).to.be.greaterThan(2);
      expect(results.map((r) => r.title)).to.contain('dashboard with map');
      expect(results.map((r) => r.title)).to.contain('Amazing Dashboard');
    });
  });
}
