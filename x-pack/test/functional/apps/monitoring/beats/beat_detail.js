/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const listing = getService('monitoringBeatsListing');
  const detail = getService('monitoringBeatDetail');

  describe('beats detail', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/beats', {
        from: '2017-12-19 17:14:09.000',
        to: '2017-12-19 18:15:09.000',
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
        name: 'Name\ntsullivan.local-1-17',
        version: 'Version\n7.0.0-alpha1',
        type: 'Type\nDuckbeat',
        host: 'Host\ntsullivan.local',
        output: 'Output\nElasticsearch',
        configReloads: 'Config reloads\n0',
        uptime: 'Uptime\n6 minutes',
        eventsTotal: 'Events total\n17',
        eventsEmitted: 'Events emitted\n17',
        eventsDropped: 'Events dropped\n0',
        bytesWritten: 'Bytes sent\n18.3 KB',
      });
    });
  });
}
