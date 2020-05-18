/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { NavigableGlobalSearchResult } from '../../../../plugins/global_search/public/services/types';
import '../../plugins/global_search_test/public/types';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  const findResultsWithAPI = async (t: string): Promise<NavigableGlobalSearchResult[]> => {
    return browser.executeAsync(async (term: string, cb: Function) => {
      window.__globalSearchTestApi.findAll(term).then(results => {
        cb(results);
      });
    }, t) as any; // executeAsync signature is broken. return type should be inferred from the cb param.
  };

  describe('GlobalSearch API', function() {
    beforeEach(async function() {
      await pageObjects.common.navigateToApp('globalSearchTestApp');
    });

    it('return no results when no provider return results', async () => {
      const results = await findResultsWithAPI('no_match');
      expect(results.length).to.be(0);
    });
    it('return results from the client provider', async () => {
      const results = await findResultsWithAPI('client');
      expect(results.length).to.be(2);
      expect(results.map(r => r.id)).to.eql(['client1', 'client2']);
    });
    it('return results from the server provider', async () => {
      const results = await findResultsWithAPI('server');
      expect(results.length).to.be(2);
      expect(results.map(r => r.id)).to.eql(['server1', 'server2']);
    });
    it('return mixed results from both client and server providers', async () => {
      const results = await findResultsWithAPI('server+client');
      expect(results.length).to.be(4);
      expect(results.map(r => r.id)).to.eql(['client1', 'client2', 'server1', 'server2']);
    });
  });
}
