/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { log, timerange } from '@kbn/synthtrace-client';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'svlCommonPage', 'discover']);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const dataViews = getService('dataViews');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Observability landing redirects (Logs Essentials)', function () {
    afterEach(async () => {
      await synthtrace.clean();
    });

    it('redirects to onboarding when no logs data is present', async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      await PageObjects.common.navigateToApp('landingPage');
      await testSubjects.existOrFail('obltOnboardingHomeTitle');
    });

    it('redirects to Discover when logs data is present', async () => {
      const start = moment().subtract(2, 'minutes').valueOf();
      const end = moment().valueOf();

      await synthtrace.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('Landing redirect smoke log')
              .timestamp(timestamp)
              .dataset('synth.landing')
              .namespace('default')
              .defaults({ 'service.name': 'synth-landing' })
          ),
      ]);

      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      await PageObjects.common.navigateToApp('landingPage');

      await retry.tryForTime(60 * 1000, async () => {
        const url = await browser.getCurrentUrl();
        if (!url.includes('/app/discover')) {
          throw new Error('Not yet redirected to Discover');
        }
        await dataViews.switchTo('All logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.existOrFail('discoverQueryTotalHits');
      });
    });
  });
}
