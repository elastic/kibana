/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringKibanaOverview');
  const kibanaClusterSummaryStatus = getService('monitoringKibanaSummaryStatus');

  describe('Kibana overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/singlecluster-yellow-platinum', {
        from: '2017-08-29 17:24:14.254',
        to: '2017-08-29 17:25:44.142',
      });

      // go to kibana overview
      await clusterOverview.clickKibanaOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('should have Kibana Cluster Summary Status showing correct info', async () => {
      expect(await kibanaClusterSummaryStatus.getContent()).to.eql({
        instances: 'Instances: 1',
        memory: 'Memory: 219.6 MB / 1.4 GB',
        requests: 'Requests: 174',
        connections: 'Connections: 174',
        maxResponseTime: 'Max. Response Time: 2203 ms',
        health: 'Health: green',
      });
    });

  });
}
