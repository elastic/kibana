/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['monitoring', 'header']);
  const overview = getService('monitoringClusterOverview');
  const nodesList = getService('monitoringElasticsearchNodes');
  const nodeDetail = getService('monitoringElasticsearchNodeDetail');

  describe('Elasticsearch node detail', () => {
    describe('Active Nodes', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
          from: 'Oct 5, 2017 @ 20:31:48.354',
          to: 'Oct 5, 2017 @ 20:35:12.176'
        });

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      afterEach(async () => {
        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbEsNodes'); // return back for next test
      });

      it('should show node summary of master node with 20 indices and 38 shards', async () => {
        await nodesList.clickRowByResolver('jUT5KdxfRbORSCWkb5zjmA');

        expect(await nodeDetail.getSummary()).to.eql({
          transportAddress: 'Transport Address\n127.0.0.1:9300',
          jvmHeap: 'JVM Heap\n29%',
          freeDiskSpace: 'Free Disk Space\n173.9 GB (37.42%)',
          documentCount: 'Documents\n24.8k',
          dataSize: 'Data\n50.4 MB',
          indicesCount: 'Indices\n20',
          shardsCount: 'Shards\n38',
          nodeType: 'Type\nMaster Node',
          status: 'Status: Online',
        });
      });

      it('should show node summary of data node with 4 indices and 4 shards', async () => {
        await nodesList.clickRowByResolver('bwQWH-7IQY-mFPpfoaoFXQ');

        expect(await nodeDetail.getSummary()).to.eql({
          transportAddress: 'Transport Address\n127.0.0.1:9302',
          jvmHeap: 'JVM Heap\n17%',
          freeDiskSpace: 'Free Disk Space\n173.9 GB (37.42%)',
          documentCount: 'Documents\n240',
          dataSize: 'Data\n1.4 MB',
          indicesCount: 'Indices\n4',
          shardsCount: 'Shards\n4',
          nodeType: 'Type\nNode',
          status: 'Status: Online',
        });
      });
    });

    describe('Offline Node', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-red-platinum', {
          from: 'Oct 6, 2017 @ 19:53:06.748',
          to: 'Oct 6, 2017 @ 20:15:30.212'
        });

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('should show node summary of NA for offline node', async () => {
        await nodesList.clickRowByResolver('1jxg5T33TWub-jJL4qP0Wg');

        expect(await nodeDetail.getSummary()).to.eql({
          transportAddress: 'Transport Address\n127.0.0.1:9302',
          jvmHeap: 'JVM Heap\nN/A',
          freeDiskSpace: 'Free Disk Space\nN/A (N/A)',
          documentCount: 'Documents\nN/A',
          dataSize: 'Data\nN/A',
          indicesCount: 'Indices\nN/A',
          shardsCount: 'Shards\nN/A',
          nodeType: 'Type\nOffline Node',
          status: 'Status: Offline',
        });
      });
    });

  });
}
