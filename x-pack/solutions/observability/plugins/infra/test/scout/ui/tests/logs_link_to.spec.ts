/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { EXTENDED_TIMEOUT } from '../fixtures/constants';

const ONE_HOUR = 60 * 60 * 1000;
const TRACE_ID = '433b4651687e18be2c6c8e3b11f53d09';
const TIMESTAMP = Date.parse('2024-05-01T12:00:00.000Z');

/**
 * The classic Logs `/link-to` routes are redirect-only: they resolve the `time`
 * and `filter` query params into a kuery query + a ±1h range and forward to
 * Discover via the shared logs locator. These specs assert that redirect
 * contract (destination + encoded query/time), mirroring the FTR `link_to` suite.
 */
test.describe(
  'Logs link-to redirects',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('redirects /link-to to Discover with the parsed query and time range', async ({
      page,
      kbnUrl,
    }) => {
      const startDate = new Date(TIMESTAMP - ONE_HOUR).toISOString();
      const endDate = new Date(TIMESTAMP + ONE_HOUR).toISOString();

      await page.goto(
        `${kbnUrl.app('logs')}/link-to?time=${TIMESTAMP}&filter=trace.id:${TRACE_ID}`
      );
      await page.waitForURL('**/app/discover**', { timeout: EXTENDED_TIMEOUT });

      const url = page.url();
      expect(new URL(url).pathname).toBe('/app/discover');
      // Playwright's `page.url()` returns the rison state with literal single quotes
      // (Selenium/FTR returned them percent-encoded as `%27`).
      expect(url).toContain(`query:(language:kuery,query:'trace.id:${TRACE_ID}'))`);
      expect(url).toContain(`time:(from:'${startDate}',to:'${endDate}')`);
    });

    test('redirects node /link-to to Discover with the pod and trace query', async ({
      page,
      kbnUrl,
    }) => {
      const nodeId = 1234;
      const startDate = new Date(TIMESTAMP - ONE_HOUR).toISOString();
      const endDate = new Date(TIMESTAMP + ONE_HOUR).toISOString();

      // `testView` is the (arbitrary) log-view id path param; the redirect derives
      // the query from `filter`/nodeId, not from the view id.
      await page.goto(
        `${kbnUrl.app(
          'logs'
        )}/link-to/testView/pod-logs/${nodeId}?time=${TIMESTAMP}&filter=trace.id:${TRACE_ID}`
      );
      await page.waitForURL('**/app/discover**', { timeout: EXTENDED_TIMEOUT });

      const url = page.url();
      expect(new URL(url).pathname).toBe('/app/discover');
      // Spaces inside the kuery value stay percent-encoded (`%20`), while rison's
      // string quotes come back as literal `'` from Playwright's `page.url()`.
      expect(url).toContain(
        `query:(language:kuery,query:'(kubernetes.pod.uid:%20${nodeId})%20and%20(trace.id:${TRACE_ID})'))`
      );
      expect(url).toContain(`time:(from:'${startDate}',to:'${endDate}')`);
    });
  }
);
