/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { URL } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

const ONE_HOUR = 60 * 60 * 1000;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const browser = getService('browser');

  const timestamp = Date.now();
  const startDate = new Date(timestamp - ONE_HOUR).toISOString();
  const endDate = new Date(timestamp + ONE_HOUR).toISOString();

  const traceId = '433b4651687e18be2c6c8e3b11f53d09';

  describe('link-to Logs', function () {
    it('redirects to the logs app and parses URL search params correctly', async () => {
      const location = {
        hash: '',
        pathname: '/link-to',
        search: `time=${timestamp}&filter=trace.id:${traceId}`,
        state: undefined,
      };

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
        const parsedUrl = new URL(currentUrl);

        expect(parsedUrl.pathname).to.be('/app/logs/stream');
        expect(parsedUrl.searchParams.get('logFilter')).to.be(
          `(language:kuery,query:'trace.id:${traceId}')`
        );
        expect(parsedUrl.searchParams.get('logPosition')).to.be(
          `(end:'${endDate}',position:(tiebreaker:0,time:${timestamp}),start:'${startDate}',streamLive:!f)`
        );
        expect(parsedUrl.searchParams.get('sourceId')).to.be('default');
      });
    });
  });
};
