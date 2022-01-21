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
  const nodes = getService('monitoringLogstashNodes');
  const logstashSummaryStatus = getService('monitoringLogstashSummaryStatus');
  const retry = getService('retry');

  describe('Logstash nodes mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/logstash_pipelines_mb', {
        from: 'Jan 22, 2018 @ 09:10:00.000',
        to: 'Jan 22, 2018 @ 09:41:00.000',
        useCreate: true,
      });

      await clusterOverview.closeAlertsModal();

      // go to logstash nodes
      await clusterOverview.clickLsNodes();
      expect(await nodes.isOnNodesListing()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });
    it('should have Logstash Cluster Summary Status showing correct info', async () => {
      expect(await logstashSummaryStatus.getContent()).to.eql({
        eventsInTotal: 'Events Received\n117.9k',
        eventsOutTotal: 'Events Emitted\n111.9k',
        memoryUsed: 'Memory\n528.4 MB / 1.9 GB',
        nodeCount: 'Nodes\n2',
      });
    });
    it('should have a nodes table with the correct number of rows', async () => {
      await retry.try(async () => {
        const rows = await nodes.getRows();
        expect(rows.length).to.be(2);
      });
    });
    it('should have a nodes table with the correct data', async () => {
      const nodesAll = await nodes.getNodesAll();

      const tableData = [
        {
          id: 'Shaunaks-MacBook-Pro.local',
          httpAddress: '127.0.0.1:9601',
          alertStatus: 'Clear',
          cpuUsage: '0.00%',
          loadAverage: '4.54',
          jvmHeapUsed: '22.00%',
          eventsOut: '73.5k',
          configReloadsSuccess: '0 successes',
          configReloadsFailure: '0 failures',
          version: '7.0.0-alpha1',
        },
        {
          id: 'Shaunaks-MacBook-Pro.local',
          httpAddress: '127.0.0.1:9600',
          alertStatus: 'Clear',
          cpuUsage: '2.00%',
          loadAverage: '4.76',
          jvmHeapUsed: '30.00%',
          eventsOut: '38.4k',
          configReloadsSuccess: '0 successes',
          configReloadsFailure: '0 failures',
          version: '7.0.0-alpha1',
        },
      ];

      nodesAll.forEach((obj, index) => {
        expect(nodesAll[index].id).to.be(tableData[index].id);
        expect(nodesAll[index].httpAddress).to.be(tableData[index].httpAddress);
        expect(nodesAll[index].alertStatus).to.be(tableData[index].alertStatus);
        expect(nodesAll[index].cpuUsage).to.be(tableData[index].cpuUsage);
        expect(nodesAll[index].loadAverage).to.be(tableData[index].loadAverage);
        expect(nodesAll[index].jvmHeapUsed).to.be(tableData[index].jvmHeapUsed);
        expect(nodesAll[index].eventsOut).to.be(tableData[index].eventsOut);
        expect(nodesAll[index].configReloadsSuccess).to.be(tableData[index].configReloadsSuccess);
        expect(nodesAll[index].configReloadsFailure).to.be(tableData[index].configReloadsFailure);
        expect(nodesAll[index].version).to.be(tableData[index].version);
      });
    });

    it('should filter for non-existent node', async () => {
      await nodes.setFilter('foobar');
      await nodes.assertNoData();
      await nodes.clearFilter();
    });

    it('should filter for specific nodes', async () => {
      await nodes.setFilter('sha');

      await retry.try(async () => {
        const rows = await nodes.getRows();
        expect(rows.length).to.be(2);
      });

      await nodes.clearFilter();
    });
  });
}
