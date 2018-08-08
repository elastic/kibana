/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringBeatsOverview');
  const beatsSummaryStatus = getService('monitoringBeatsSummaryStatus');

  describe('beats overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/beats', {
        from: '2017-12-19 17:14:09',
        to: '2017-12-19 18:15:09',
      });

      // go to beats overview
      await clusterOverview.clickBeatsOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('shows no recent activity', async () => {
      expect(await overview.noRecentActivityMessageIsShowing()).to.be(true);
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
        totalEvents: '699.9k',
        bytesSent: '427.9 MB',
      });
    });

  });
}
