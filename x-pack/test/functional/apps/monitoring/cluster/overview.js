/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');

  describe('Cluster overview', () => {
    describe('for Green cluster with Gold license', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-green-gold', {
          from: 'Aug 23, 2017 @ 21:29:35.267',
          to: 'Aug 23, 2017 @ 21:47:25.556',
        });
      });

      after(async () => {
        await tearDown();
      });

      it('shows alerts panel, because there are resolved alerts in the time range', async () => {
        expect(await overview.doesClusterAlertsExist()).to.be(true);
      });

      it('elasticsearch panel has no ML line, because license is Gold', async () => {
        expect(await overview.doesEsMlJobsExist()).to.be(false);
      });

      it('shows elasticsearch panel with data', async () => {
        expect(await overview.getEsStatus()).to.be('Health is green');
        expect(await overview.getEsVersion()).to.be('7.0.0-alpha1');
        expect(await overview.getEsUptime()).to.be('20 minutes');
        expect(await overview.getEsNumberOfNodes()).to.be('Nodes: 2');
        expect(await overview.getEsDiskAvailable()).to.be('40.35%\n187.6 GB / 464.8 GB');
        expect(await overview.getEsJvmHeap()).to.be('43.90%\n526.4 MB / 1.2 GB');
        expect(await overview.getEsNumberOfIndices()).to.be('Indices: 17');
        expect(await overview.getEsDocumentsCount()).to.be('4,001');
        expect(await overview.getEsDiskUsage()).to.be('11.3 MB');
        expect(await overview.getEsPrimaryShards()).to.be('49');
        expect(await overview.getEsReplicaShards()).to.be('49');
      });

      it('shows kibana panel', async () => {
        expect(await overview.getEsStatus()).to.be('Health is green');
        expect(await overview.getKbnRequests()).to.be('914');
        expect(await overview.getKbnMaxResponseTime()).to.be('2873 ms');
        expect(await overview.getKbnInstances()).to.be('Instances: 1');
        expect(await overview.getKbnConnections()).to.be('646');
        expect(await overview.getKbnMemoryUsage()).to.be('13.05%\n186.9 MB / 1.4 GB');
      });

      it('shows logstash panel', async () => {
        expect(await overview.getLsEventsReceived()).to.be('31');
        expect(await overview.getLsEventsEmitted()).to.be('31');
        expect(await overview.getLsNodes()).to.be('Nodes: 1');
        expect(await overview.getLsUptime()).to.be('10 minutes');
        expect(await overview.getLsJvmHeap()).to.be('46.16%\n457.3 MB / 990.8 MB');
        expect(await overview.getLsPipelines()).to.be('Pipelines: 1');
      });
    });

    describe('for Yellow cluster with Platinum license', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-yellow-platinum', {
          from: 'Aug 29, 2017 @ 17:23:47.528',
          to: 'Aug 29, 2017 @ 17:25:50.701',
        });
      });

      after(async () => {
        await tearDown();
      });

      it('shows alerts panel, because cluster status is Yellow', async () => {
        expect(await overview.doesClusterAlertsExist()).to.be(true);
      });

      it('elasticsearch panel has ML, because license is Platinum', async () => {
        expect(await overview.getEsMlJobs()).to.be('0');
      });

      it('shows elasticsearch panel with data', async () => {
        expect(await overview.getEsStatus()).to.be('Health is yellow');
        expect(await overview.getEsVersion()).to.be('7.0.0-alpha1');
        expect(await overview.getEsUptime()).to.be('5 minutes');
        expect(await overview.getEsNumberOfNodes()).to.be('Nodes: 1');
        expect(await overview.getEsDiskAvailable()).to.be('40.05%\n186.2 GB / 464.8 GB');
        expect(await overview.getEsJvmHeap()).to.be('25.06%\n150.2 MB / 599.4 MB');
        expect(await overview.getEsNumberOfIndices()).to.be('Indices: 8');
        expect(await overview.getEsDocumentsCount()).to.be('160');
        expect(await overview.getEsDiskUsage()).to.be('806.3 KB');
        expect(await overview.getEsPrimaryShards()).to.be('8');
        expect(await overview.getEsReplicaShards()).to.be('0');
      });

      it('shows kibana panel', async () => {
        expect(await overview.getKbnStatus()).to.be('Health is green');
        expect(await overview.getKbnRequests()).to.be('174');
        expect(await overview.getKbnMaxResponseTime()).to.be('2203 ms');
        expect(await overview.getKbnInstances()).to.be('Instances: 1');
        expect(await overview.getKbnConnections()).to.be('174');
        expect(await overview.getKbnMemoryUsage()).to.be('15.33%\n219.6 MB / 1.4 GB');
      });

      it('does not show logstash panel', async () => {
        expect(await overview.doesLsPanelExist()).to.be(false);
      });
    });

    describe('for Yellow cluster with Basic license and no Kibana and Logstash', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-yellow-basic', {
          from: 'Aug 29, 2017 @ 17:55:43.879',
          to: 'Aug 29, 2017 @ 18:01:34.958',
        });
      });

      after(async () => {
        await tearDown();
      });

      it('does not show alerts panel, because license is Basic', async () => {
        expect(await overview.doesClusterAlertsExist()).to.be(false);
      });

      it('elasticsearch panel does not have ML, because license is Basic', async () => {
        expect(await overview.doesEsMlJobsExist()).to.be(false);
      });

      it('shows elasticsearch panel with data', async () => {
        expect(await overview.getEsStatus()).to.be('Health is yellow');
        expect(await overview.getEsVersion()).to.be('7.0.0-alpha1');
        expect(await overview.getEsUptime()).to.be('8 minutes');
        expect(await overview.getEsNumberOfNodes()).to.be('Nodes: 1');
        expect(await overview.getEsDiskAvailable()).to.be('40.02%\n186.0 GB / 464.8 GB');
        expect(await overview.getEsJvmHeap()).to.be('20.06%\n120.2 MB / 599.4 MB');
        expect(await overview.getEsNumberOfIndices()).to.be('Indices: 7');
        expect(await overview.getEsDocumentsCount()).to.be('410');
        expect(await overview.getEsDiskUsage()).to.be('724.4 KB');
        expect(await overview.getEsPrimaryShards()).to.be('7');
        expect(await overview.getEsReplicaShards()).to.be('0');
      });

      it('shows kibana panel', async () => {
        expect(await overview.doesKbnPanelExist()).to.be(false);
      });

      it('does not show logstash panel', async () => {
        expect(await overview.doesLsPanelExist()).to.be(false);
      });
    });
  });
}
