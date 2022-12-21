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
  const overview = getService('monitoringElasticsearchOverview');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe('Elasticsearch overview mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup(
        'x-pack/test/functional/es_archives/monitoring/singlecluster_three_nodes_shard_relocation_mb',
        {
          from: 'Oct 5, 2017 @ 20:31:48.354',
          to: 'Oct 5, 2017 @ 20:35:12.176',
          useCreate: true,
        }
      );

      await clusterOverview.closeAlertsModal();

      // go to overview
      await clusterOverview.clickEsOverview();
      expect(await overview.isOnOverview()).to.be(true);
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
  });
}
