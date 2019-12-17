/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const browser = getService('browser');

  describe('Infra link-to', function() {
    this.tags('smoke');
    it('redirects to the logs app and parses URL search params correctly', async () => {
      const location = {
        hash: '',
        pathname: '/link-to/logs',
        search: '?time=1565707203194&filter=trace.id:433b4651687e18be2c6c8e3b11f53d09',
        state: undefined,
      };
      const expectedSearchString =
        "logFilter=(expression:'trace.id:433b4651687e18be2c6c8e3b11f53d09',kind:kuery)&logPosition=(position:(tiebreaker:0,time:1565707203194))&sourceId=default";
      const expectedRedirectPath = '/logs/stream?';

      await pageObjects.common.navigateToActualUrl(
        'infraOps',
        `${location.pathname}${location.search}`
      );
      await retry.tryForTime(5000, async () => {
        const currentUrl = await browser.getCurrentUrl();
        const [, currentHash] = decodeURIComponent(currentUrl).split('#');
        // Account for unpredictable location of the g parameter in the search string
        expect(currentHash.slice(0, 13)).to.be(expectedRedirectPath);
        expect(currentHash.slice(13)).to.contain(expectedSearchString);
      });
    });
  });
};
