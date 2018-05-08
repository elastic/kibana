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
  const indicesList = getService('monitoringElasticsearchIndices');
  const indexDetail = getService('monitoringElasticsearchIndexDetail');

  describe('Elasticsearch index detail', () => {

    afterEach(async () => {
      await PageObjects.monitoring.clickBreadcrumb('breadcrumbEsIndices'); // return back for next test
      await indicesList.clearFilter();
    });

    describe('Active Indices', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
          from: '2017-10-05 20:31:48.354',
          to: '2017-10-05 20:35:12.176'
        });

        // go to indices listing
        await overview.clickEsIndices();
        expect(await indicesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('green status index with full shard allocation', async () => {
        await indicesList.clickRowByName('avocado-tweets-2017.10.02');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total: 8.8 MB',
          dataSizePrimaries: 'Primaries: 4.4 MB',
          documentCount: 'Documents: 628',
          totalShards: 'Total Shards: 10',
          unassignedShards: 'Unassigned Shards: 0',
          health: 'Health: green',
        });
      });

      it('green status index with single relocating shard', async () => {
        await indicesList.clickRowByName('relocation_test');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total: 4.8 KB',
          dataSizePrimaries: 'Primaries: 4.8 KB',
          documentCount: 'Documents: 1',
          totalShards: 'Total Shards: 1',
          unassignedShards: 'Unassigned Shards: 0',
          health: 'Health: green',
        });
      });

      it('yellow status index with single unallocated shard', async () => {
        await indicesList.clickRowByName('phone-home');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total: 1.2 MB',
          dataSizePrimaries: 'Primaries: 657.6 KB',
          documentCount: 'Documents: 10',
          totalShards: 'Total Shards: 10',
          unassignedShards: 'Unassigned Shards: 1',
          health: 'Health: yellow',
        });
      });
    });

    describe('Deleted Index', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-red-platinum', {
          from: '2017-10-06 19:53:06.748',
          to: '2017-10-06 20:15:30.212'
        });

        // go to indices listing
        await overview.clickEsIndices();
        expect(await indicesList.isOnListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it.skip('shows NA', async () => {
        await indicesList.setFilter('deleted');
        await indicesList.clickRowByName('many-0001_clruksahirti');

        expect(await indexDetail.getSummary()).to.eql({
          dataSize: 'Total: 3.6 KB',
          dataSizePrimaries: 'Primaries: 3.6 KB',
          documentCount: 'Documents: 1',
          totalShards: 'Total Shards: N/A',
          unassignedShards: 'Unassigned Shards: N/A',
          health: 'Health: Not Available',
        });
      });
    });

  });
}
