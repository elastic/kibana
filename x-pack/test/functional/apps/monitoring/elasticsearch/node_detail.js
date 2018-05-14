/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
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
          from: '2017-10-05 20:31:48.354',
          to: '2017-10-05 20:35:12.176'
        });

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      afterEach(async () => {
        await PageObjects.monitoring.clickBreadcrumb('breadcrumbEsNodes'); // return back for next test
      });

      it('should show node summary of master node with 20 indices and 38 shards', async () => {
        await nodesList.clickRowByResolver('jUT5KdxfRbORSCWkb5zjmA');

        expect(await nodeDetail.getSummary()).to.eql({
          transportAddress: '127.0.0.1:9300',
          jvmHeap: '29%',
          freeDiskSpace: '173.9 GB',
          documentCount: '24.8k',
          dataSize: '50.4 MB',
          indicesCount: '20',
          shardsCount: '38',
          nodeType: 'Master Node',
          status: 'Status: Online',
        });
      });

      it('should show node summary of data node with 4 indices and 4 shards', async () => {
        await nodesList.clickRowByResolver('bwQWH-7IQY-mFPpfoaoFXQ');

        expect(await nodeDetail.getSummary()).to.eql({
          transportAddress: '127.0.0.1:9302',
          jvmHeap: '17%',
          freeDiskSpace: '173.9 GB',
          documentCount: '240',
          dataSize: '1.4 MB',
          indicesCount: '4',
          shardsCount: '4',
          nodeType: 'Node',
          status: 'Status: Online',
        });
      });
    });

    describe('Offline Node', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-red-platinum', {
          from: '2017-10-06 19:53:06.748',
          to: '2017-10-06 20:15:30.212'
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
          transportAddress: '127.0.0.1:9302',
          jvmHeap: 'N/A',
          freeDiskSpace: 'N/A',
          documentCount: 'N/A',
          dataSize: 'N/A',
          indicesCount: 'N/A',
          shardsCount: 'N/A',
          nodeType: 'Offline Node',
          status: 'Status: Offline',
        });
      });
    });

  });
}
