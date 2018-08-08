/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const listing = getService('monitoringBeatsListing');
  const detail = getService('monitoringBeatDetail');

  describe('beats detail', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/beats', {
        from: '2017-12-19 17:14:09',
        to: '2017-12-19 18:15:09',
      });

      // go to beats detail
      await clusterOverview.clickBeatsListing();
      expect(await listing.isOnListing()).to.be(true);

      await listing.clearFilter();
      await listing.setFilter('duckbeat'); // filter for a beat type that has only 1 instance
      await listing.clickRowByName('tsullivan.local-1-17');
    });

    after(async () => {
      await tearDown();
    });

    it('cluster status bar shows correct information', async () => {
      expect(await detail.getSummary()).to.eql({
        name: 'tsullivan.local-1-17',
        version: '7.0.0-alpha1',
        type: 'Duckbeat',
        host: 'tsullivan.local',
        output: 'Elasticsearch',
        configReloads: 0,
        uptime: '6 minutes',
        eventsTotal: 17,
        eventsEmitted: 17,
        eventsDropped: 0,
        bytesWritten: '18.3 KB',
      });
    });

  });
}
