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
        search: 'time=1565707203194&filter=trace.id:433b4651687e18be2c6c8e3b11f53d09',
        state: undefined,
      };
      const expectedSearchString =
        "sourceId=default&logPosition=(position:(tiebreaker:0,time:1565707203194),streamLive:!f)&logFilter=(expression:'trace.id:433b4651687e18be2c6c8e3b11f53d09',kind:kuery)";
      const expectedRedirectPath = '/logs/stream?';

      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraLogs',
        location.pathname,
        location.search,
        {
          ensureCurrentUrl: false,
        }
      );
      await retry.tryForTime(5000, async () => {
        const currentUrl = await browser.getCurrentUrl();
        const decodedUrl = decodeURIComponent(currentUrl);
        expect(decodedUrl).to.contain(expectedRedirectPath);
        expect(decodedUrl).to.contain(expectedSearchString);
      });
    });
  });
};
