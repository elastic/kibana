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
  const instances = getService('monitoringKibanaInstances');
  const kibanaClusterSummaryStatus = getService('monitoringKibanaSummaryStatus');

  // Failing: See https://github.com/elastic/kibana/issues/98190
  describe.skip('Kibana instances listing mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/singlecluster_yellow_platinum_mb', {
        from: 'Aug 29, 2017 @ 17:24:14.254',
        to: 'Aug 29, 2017 @ 17:25:44.142',
      });

      // go to kibana instances
      await clusterOverview.clickKibanaInstances();
      expect(await instances.isOnInstances()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('should have Kibana Cluster Summary Status showing correct info', async () => {
      expect(await kibanaClusterSummaryStatus.getContent()).to.eql({
        instances: 'Instances\n1',
        memory: 'Memory\n219.6 MB / 1.4 GB',
        requests: 'Requests\n174',
        connections: 'Connections\n174',
        maxResponseTime: 'Max. Response Time\n2203 ms',
        health: 'Health: green',
      });
    });
  });
}
