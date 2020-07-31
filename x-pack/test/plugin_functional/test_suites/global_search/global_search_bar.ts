/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
// import { GlobalSearchResult } from '../../../../plugins/global_search/common/types';
// import { GlobalSearchTestApi } from '../../plugins/global_search_test/public/types';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  // const browser = getService('browser');

  // const findResultsWithAPI = async (t: string): Promise<GlobalSearchResult[]> => {
  //   return browser.executeAsync(async (term, cb) => {
  //     const { start } = window.__coreProvider;
  //     const globalSearchTestApi: GlobalSearchTestApi = start.plugins.globalSearchTest;
  //     globalSearchTestApi.findTest(term).then(cb);
  //   }, t);
  // };

  describe('GlobalSearchBar', function () {
    beforeEach(async function () {
      // await common.navigateToApp('globalSearchTestApp');
    });

    it('works', async () => {
      // const results = await findResultsWithAPI('no_match');
      // TODO
      expect(true).to.be(true);
    });
  });
}
