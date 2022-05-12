/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringLogstashOverview');
  const logstashSummaryStatus = getService('monitoringLogstashSummaryStatus');

  describe('Logstash overview mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/logstash_pipelines_mb', {
        from: 'Jan 22, 2018 @ 09:10:00.000',
        to: 'Jan 22, 2018 @ 09:41:00.000',
        useCreate: true,
      });

      await clusterOverview.closeAlertsModal();

      // go to logstash overview
      await clusterOverview.clickLsOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });
    it('should have an Logstash Summary Status with correct info', async () => {
      expect(await logstashSummaryStatus.getContent()).to.eql({
        eventsInTotal: 'Events Received\n117.9k',
        eventsOutTotal: 'Events Emitted\n111.9k',
        memoryUsed: 'Memory\n528.4 MB / 1.9 GB',
        nodeCount: 'Nodes\n2',
      });
    });
  });
}
