/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');
  const nodesList = getService('monitoringElasticsearchNodes');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe('Elasticsearch nodes listing', function () {
    // FF issue: https://github.com/elastic/kibana/issues/35551
    this.tags(['skipFirefox']);

    describe('with offline node', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
          from: 'Oct 5, 2017 @ 20:28:28.475',
          to: 'Oct 5, 2017 @ 20:34:38.341',
        });

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('should have an Elasticsearch Cluster Summary Status with correct info', async () => {
        expect(await esClusterSummaryStatus.getContent()).to.eql({
          nodesCount: 'Nodes\n2',
          indicesCount: 'Indices\n20',
          memory: 'JVM Heap\n696.6 MB / 1.3 GB',
          totalShards: 'Total shards\n79',
          unassignedShards: 'Unassigned shards\n7',
          documentCount: 'Documents\n25,758',
          dataSize: 'Data\n100.0 MB',
          health: 'Health: yellow',
        });
      });

      describe('skipCloud', function () {
        // TODO: https://github.com/elastic/stack-monitoring/issues/31
        this.tags(['skipCloud']);

        it('should have a nodes table with correct rows with default sorting', async () => {
          const rows = await nodesList.getRows();
          expect(rows.length).to.be(3);

          const nodesAll = await nodesList.getNodesAll();
          const tableData = [
            {
              name: 'whatever-01',
              status: 'Status: Online',
              cpu: '0% \n3% max\n0% min',
              load: '3.28 \n3.71 max\n2.19 min',
              memory: '39% \n52% max\n25% min',
              disk: '173.9 GB \n173.9 GB max\n173.9 GB min',
              shards: '38',
            },
            {
              name: 'whatever-02',
              status: 'Status: Online',
              cpu: '2% \n3% max\n0% min',
              load: '3.28 \n3.73 max\n2.29 min',
              memory: '25% \n49% max\n25% min',
              disk: '173.9 GB \n173.9 GB max\n173.9 GB min',
              shards: '38',
            },
            { name: 'whatever-03', status: 'Status: Offline' },
          ];
          nodesAll.forEach((obj, node) => {
            expect(nodesAll[node].name).to.be(tableData[node].name);
            expect(nodesAll[node].status).to.be(tableData[node].status);
            expect(nodesAll[node].cpu).to.be(tableData[node].cpu);
            expect(nodesAll[node].load).to.be(tableData[node].load);
            expect(nodesAll[node].memory).to.be(tableData[node].memory);
            expect(nodesAll[node].disk).to.be(tableData[node].disk);
            expect(nodesAll[node].shards).to.be(tableData[node].shards);
          });
        });

        it('should sort by cpu', async () => {
          await nodesList.clickCpuCol();
          await nodesList.clickCpuCol();

          const nodesAll = await nodesList.getNodesAll();
          const tableData = [{ cpu: '2% \n3% max\n0% min' }, { cpu: '0% \n3% max\n0% min' }, { cpu: undefined }];
          nodesAll.forEach((obj, node) => {
            expect(nodesAll[node].cpu).to.be(tableData[node].cpu);
          });
        });

        it('should sort by load average', async () => {
          await nodesList.clickLoadCol();
          await nodesList.clickLoadCol();

          const nodesAll = await nodesList.getNodesAll();
          const tableData = [
            { load: '3.28 \n3.71 max\n2.19 min' },
            { load: '3.28 \n3.73 max\n2.29 min' },
            { load: undefined },
          ];
          nodesAll.forEach((obj, node) => {
            expect(nodesAll[node].load).to.be(tableData[node].load);
          });
        });
      });

      it('should sort by name', async () => {
        await nodesList.clickNameCol();
        await nodesList.clickNameCol();

        const nodesAll = await nodesList.getNodesAll();
        const tableData = [
          { name: 'whatever-01' },
          { name: 'whatever-02' },
          { name: 'whatever-03' },
        ];
        nodesAll.forEach((obj, node) => {
          expect(nodesAll[node].name).to.be(tableData[node].name);
        });
      });

      it('should sort by status', async () => {
        await nodesList.clickStatusCol();
        await nodesList.clickStatusCol();

        const nodesAll = await nodesList.getNodesAll();
        const tableData = [
          { status: 'Status: Online' },
          { status: 'Status: Online' },
          { status: 'Status: Offline' },
        ];
        nodesAll.forEach((obj, node) => {
          expect(nodesAll[node].status).to.be(tableData[node].status);
        });
      });

      it('should sort by memory', async () => {
        await nodesList.clickMemoryCol();
        await nodesList.clickMemoryCol();

        const nodesAll = await nodesList.getNodesAll();
        const tableData = [
          { memory: '39% \n52% max\n25% min' },
          { memory: '25% \n49% max\n25% min' },
          { memory: undefined },
        ];
        nodesAll.forEach((obj, node) => {
          expect(nodesAll[node].memory).to.be(tableData[node].memory);
        });
      });

      it('should sort by disk', async () => {
        await nodesList.clickDiskCol();
        await nodesList.clickDiskCol();

        const nodesAll = await nodesList.getNodesAll();
        const tableData = [
          { disk: '173.9 GB \n173.9 GB max\n173.9 GB min' },
          { disk: '173.9 GB \n173.9 GB max\n173.9 GB min' },
          { disk: undefined },
        ];
        nodesAll.forEach((obj, node) => {
          expect(nodesAll[node].disk).to.be(tableData[node].disk);
        });
      });

      it('should sort by shards', async () => {
        await nodesList.clickShardsCol();
        await nodesList.clickShardsCol();

        const nodesAll = await nodesList.getNodesAll();
        const tableData = [
          { shards: '38' },
          { shards: '38' },
          { shards: undefined },
        ];
        nodesAll.forEach((obj, node) => {
          expect(nodesAll[node].shards).to.be(tableData[node].shards);
        });
      });
    });

    describe('with only online nodes', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
          from: 'Oct 5, 2017 @ 20:31:48.354',
          to: 'Oct 5, 2017 @ 20:35:12.176',
        });

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('should have an Elasticsearch Cluster Summary Status with correct info', async () => {
        expect(await esClusterSummaryStatus.getContent()).to.eql({
          nodesCount: 'Nodes\n3',
          indicesCount: 'Indices\n20',
          memory: 'JVM Heap\n575.3 MB / 2.0 GB',
          totalShards: 'Total shards\n80',
          unassignedShards: 'Unassigned shards\n5',
          documentCount: 'Documents\n25,927',
          dataSize: 'Data\n101.6 MB',
          health: 'Health: yellow',
        });
      });

      it('should filter for specific indices', async () => {
        await nodesList.setFilter('01');
        const rows = await nodesList.getRows();
        expect(rows.length).to.be(1);
        await nodesList.clearFilter();
      });

      it('should filter for non-existent index', async () => {
        await nodesList.setFilter('foobar');
        await nodesList.assertNoData();
        await nodesList.clearFilter();
      });
    });
  });

}
