/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/graphql/helpers/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['uptime']);

  describe('location', () => {
    const start = new Date().toISOString();
    const end = new Date().toISOString();

    describe('when data pfewfewresent', async () => {
      const numUpMonitors = 1;
      const numDownMonitors = 0;
      const numIps = 2;
      const checksPerMonitor = 5;
      const scheduleEvery = 10000; // fake monitor checks every 10s
      let dateRange: { start: string; end: string };

      const docs = await makeChecksWithStatus(getService('legacyEs'), 'test-id', checksPerMonitor, numIps, scheduleEvery, { summary: { geo: { location: 'fairbanks'} }}, 'up');
      console.log(JSON.stringify(docs, null, 2));
      it('has stuff i want it to have', async () => {
        await pageObjects.uptime.goToUptimePageAndSetDateRange(start, end);
        await pageObjects.uptime.locationMissingIsDisplayed();
      });
    });
  });
});