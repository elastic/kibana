/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { URL } from 'url';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ONE_HOUR = 60 * 60 * 1000;
const LOG_VIEW_ID = 'testView';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const browser = getService('browser');

  const date = new Date();
  const timestamp = date.getTime();
  const startDate = new Date(timestamp - ONE_HOUR).toISOString();
  const endDate = new Date(timestamp + ONE_HOUR).toISOString();

  const traceId = '433b4651687e18be2c6c8e3b11f53d09';

  describe('link-to Logs', function () {
    describe('Redirect to Logs', function () {
      it('redirects to the logs app and parses URL search params correctly', async () => {
        const location = {
          hash: '',
          pathname: `/link-to`,
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

        return await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);

          expect(parsedUrl.pathname).to.be('/app/observability-logs-explorer/');
          expect(parsedUrl.searchParams.get('pageState')).to.contain(
            `query:(language:kuery,query:\'trace.id:${traceId}')`
          );
          expect(parsedUrl.searchParams.get('pageState')).to.contain(
            `time:(from:'${startDate}',to:'${endDate}')`
          );
        });
      });
    });
    describe('Redirect to Node Logs', function () {
      it('redirects to the logs app and parses URL search params correctly', async () => {
        const nodeId = 1234;
        const location = {
          hash: '',
          pathname: `/link-to/${LOG_VIEW_ID}/pod-logs/${nodeId}`,
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

          expect(parsedUrl.pathname).to.be('/app/observability-logs-explorer/');
          expect(parsedUrl.searchParams.get('pageState')).to.contain(
            `query:(language:kuery,query:\'(kubernetes.pod.uid: 1234) and (trace.id:${traceId})\')`
          );
          expect(parsedUrl.searchParams.get('pageState')).to.contain(
            `time:(from:'${startDate}',to:'${endDate}')`
          );
        });
      });
    });
  });
};
