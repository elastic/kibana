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
  const beatsSummaryStatus = getService('monitoringBeatsSummaryStatus');

  describe('beats listing', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/beats', {
        from: '2017-12-19 17:14:09.000',
        to: '2017-12-19 18:15:09.000',
      });

      // go to beats listing
      await clusterOverview.clickBeatsListing();
      expect(await listing.isOnListing()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('cluster status bar shows correct information', async () => {
      expect(await beatsSummaryStatus.getContent()).to.eql({
        filebeat: 200,
        heartbeat: 100,
        metricbeat: 100,
        cowbeat: 1,
        duckbeat: 1,
        sheepbeat: 1,
        winlogbeat: 1,
        totalEvents: 'Total Events\n699.9k',
        bytesSent: 'Bytes Sent\n427.9 MB',
      });
    });
  });
}
