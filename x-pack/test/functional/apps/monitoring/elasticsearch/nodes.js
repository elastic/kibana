/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');
  const nodesList = getService('monitoringElasticsearchNodes');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe.skip('Elasticsearch nodes listing', () => { // Skip this because page takes too long to load. Fixed in 6.4.0+
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
        from: '2017-10-05 20:31:48.354',
        to: '2017-10-05 20:35:12.176',
      });

      // go to nodes listing
      await overview.clickEsNodes();
      expect(await nodesList.isOnListing()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('Elasticsearch Cluster Summary Status shows correct info', async () => {
      expect(await esClusterSummaryStatus.getContent()).to.eql({
        nodesCount: '3',
        indicesCount: '20',
        memory: '575.3 MB / 2.0 GB',
        totalShards: '80',
        unassignedShards: '5',
        documentCount: '25,927',
        dataSize: '101.6 MB',
        health: 'Health: yellow',
      });
    });

  });
}
