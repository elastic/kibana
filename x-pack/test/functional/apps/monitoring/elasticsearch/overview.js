/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringElasticsearchOverview');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe('Elasticsearch overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
        from: '2017-10-05 20:31:48.354',
        to: '2017-10-05 20:35:12.176'
      });

      // go to overview
      await clusterOverview.clickEsOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('should have an Elasticsearch Cluster Summary Status with correct info', async () => {
      expect(await esClusterSummaryStatus.getContent()).to.eql({
        nodesCount: 'Nodes: 3',
        indicesCount: 'Indices: 20',
        memory: 'Memory: 575.3 MB / 2.0 GB',
        totalShards: 'Total Shards: 80',
        unassignedShards: 'Unassigned Shards: 5',
        documentCount: 'Documents: 25,927',
        dataSize: 'Data: 101.6 MB',
        health: 'Health: yellow',
      });
    });
  });
}
