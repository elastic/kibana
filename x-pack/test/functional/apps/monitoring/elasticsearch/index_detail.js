/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['monitoring', 'header']);
  const overview = getService('monitoringClusterOverview');
  const indicesList = getService('monitoringElasticsearchIndices');
  const indexDetail = getService('monitoringElasticsearchIndexDetail');

  describe('Elasticsearch index detail', () => {
    afterEach(async () => {
      await PageObjects.monitoring.clickBreadcrumb('~breadcrumbEsIndices'); // return back for next test
      await indicesList.clearFilter();
    });

    describe('Active Indices', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
          from: '2017-10-05 20:31:48.354',
          to: '2017-10-05 20:35:12.176',
        });

        // go to indices listing
        await overview.clickEsIndices();
        expect(await indicesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('should have an index summary with green status index with full shard allocation', async () => {
        await indicesList.clickRowByName('avocado-tweets-2017.10.02');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total\n8.8 MB',
          dataSizePrimaries: 'Primaries\n4.4 MB',
          documentCount: 'Documents\n628',
          totalShards: 'Total shards\n10',
          unassignedShards: 'Unassigned shards\n0',
          health: 'Health: green',
        });
      });

      it('should have an index summary with green status index with single relocating shard', async () => {
        await indicesList.clickRowByName('relocation_test');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total\n4.8 KB',
          dataSizePrimaries: 'Primaries\n4.8 KB',
          documentCount: 'Documents\n1',
          totalShards: 'Total shards\n1',
          unassignedShards: 'Unassigned shards\n0',
          health: 'Health: green',
        });
      });

      it('should have an index summary with yellow status index with single unallocated shard', async () => {
        await indicesList.clickRowByName('phone-home');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total\n1.2 MB',
          dataSizePrimaries: 'Primaries\n657.6 KB',
          documentCount: 'Documents\n10',
          totalShards: 'Total shards\n10',
          unassignedShards: 'Unassigned shards\n1',
          health: 'Health: yellow',
        });
      });
    });

    describe('Deleted Index', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-red-platinum', {
          from: '2017-10-06 19:53:06.748',
          to: '2017-10-06 20:15:30.212',
        });

        // go to indices listing
        await overview.clickEsIndices();
        expect(await indicesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it.skip('should have an index summary with NA for deleted index', async () => {
        await indicesList.setFilter('deleted');
        await indicesList.clickRowByName('many-0001_clruksahirti');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total:\n3.6 KB',
          dataSizePrimaries: 'Primaries:\n3.6 KB',
          documentCount: 'Documents:\n1',
          totalShards: 'Total Shards:\nN/A',
          unassignedShards: 'Unassigned Shards:\nN/A',
          health: 'Health: Not Available',
        });
      });
    });
  });
}
