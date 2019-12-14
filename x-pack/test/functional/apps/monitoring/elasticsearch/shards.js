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
  const nodesList = getService('monitoringElasticsearchNodes');
  const shards = getService('monitoringElasticsearchShards');

  // FLAKY: https://github.com/elastic/kibana/issues/47184
  describe.skip('Elasticsearch shard legends', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/singlecluster-three-nodes-shard-relocation', {
        from: '2017-10-05 19:34:48.000',
        to: '2017-10-05 20:35:12.000',
      });
    });

    after(async () => {
      await tearDown();
    });

    describe('Shard Allocation Per Node', () => {
      before(async () => {
        // start on cluster overview
        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbClusters');

        await PageObjects.header.waitUntilLoadingHasFinished();

        // go to nodes listing
        await overview.clickEsNodes();
        expect(await nodesList.isOnListing()).to.be(true);
      });

      afterEach(async () => {
        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbEsNodes'); // return back for next test
      });

      it('master-data node with 20 indices and 38 shards', async () => {
        await nodesList.clickRowByResolver('jUT5KdxfRbORSCWkb5zjmA'); // whatever-01

        await shards.showSystemIndices();

        // NOTE: 20 indices are shown, but the goal is only to test top 5 interesting indices
        expect(await shards.getNodeAllocation('.monitoring-es-6-2017.10.05')).to.eql({
          visibleText: '.monitoring-es-6-2017.10.05 | 0',
          shards: [{ classification: 'shard replica initializing 0', tooltip: 'Initializing' }],
          status: 'yellow',
        });
        expect(await shards.getNodeAllocation('.monitoring-kibana-6-2017.10.05')).to.eql({
          visibleText: '.monitoring-kibana-6-2017.10.05 | 0',
          shards: [{ classification: 'shard replica initializing 0', tooltip: 'Initializing' }],
          status: 'yellow',
        });
        expect(await shards.getNodeAllocation('avocado-tweets-2017.09.30')).to.eql({
          visibleText: 'avocado-tweets-2017.09.30 | 0 | 1 | 2 | 3 | 4',
          shards: [
            { classification: 'shard replica started 0', tooltip: 'Started' },
            { classification: 'shard primary started 1', tooltip: 'Started' },
            { classification: 'shard replica started 2', tooltip: 'Started' },
            { classification: 'shard primary started 3', tooltip: 'Started' },
            { classification: 'shard primary started 4', tooltip: 'Started' },
          ],
          status: 'green',
        });
        expect(await shards.getNodeAllocation('relocation_test')).to.eql({
          visibleText: 'relocation_test | 0',
          shards: [
            { classification: 'shard primary relocating 0', tooltip: 'Relocating to whatever-03' },
          ],
          status: 'green',
        });
        expect(await shards.getNodeAllocation('phone-home')).to.eql({
          visibleText: 'phone-home | 0 | 2 | 3 | 4',
          shards: [
            { classification: 'shard primary started 0', tooltip: 'Started' },
            { classification: 'shard primary started 2', tooltip: 'Started' },
            { classification: 'shard primary started 3', tooltip: 'Started' },
            { classification: 'shard primary started 4', tooltip: 'Started' },
          ],
          status: 'yellow',
        });
      });
    });

    describe('Shard Allocation Per Index', () => {
      before(async () => {
        // start on cluster overview
        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbClusters');

        // go to indices listing
        await overview.clickEsIndices();
        expect(await indicesList.isOnListing()).to.be(true);
      });

      afterEach(async () => {
        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbEsIndices'); // return back for next test
      });

      it('green status index with full shard allocation', async () => {
        await indicesList.clickRowByName('avocado-tweets-2017.10.02');

        expect(await shards.getUnassignedIndexAllocation()).to.eql(null);

        expect(await shards.getAssignedIndexAllocationByNode('jUT5KdxfRbORSCWkb5zjmA')).to.eql({
          visibleText: 'whatever-01 | 0 | 1 | 2 | 3 | 4',
          shards: [
            { classification: 'shard primary started 0', tooltip: 'Started' },
            { classification: 'shard replica started 1', tooltip: 'Started' },
            { classification: 'shard replica started 2', tooltip: 'Started' },
            { classification: 'shard primary started 3', tooltip: 'Started' },
            { classification: 'shard primary started 4', tooltip: 'Started' },
          ],
        });

        expect(await shards.getAssignedIndexAllocationByNode('xcP6ue7eRCieNNitFTT0EA')).to.eql({
          visibleText: 'whatever-02 | 0 | 1 | 2 | 3 | 4',
          shards: [
            { classification: 'shard replica started 0', tooltip: 'Started' },
            { classification: 'shard primary started 1', tooltip: 'Started' },
            { classification: 'shard primary started 2', tooltip: 'Started' },
            { classification: 'shard replica started 3', tooltip: 'Started' },
            { classification: 'shard replica started 4', tooltip: 'Started' },
          ],
        });
      });

      it('green status index with single relocating shard', async () => {
        await indicesList.clickRowByName('relocation_test');

        expect(await shards.getUnassignedIndexAllocation()).to.eql(null);

        expect(await shards.getAssignedIndexAllocationByNode('jUT5KdxfRbORSCWkb5zjmA')).to.eql({
          visibleText: 'whatever-01 | 0',
          shards: [
            { classification: 'shard primary relocating 0', tooltip: 'Relocating to whatever-03' },
          ],
        });
      });

      it('yellow status index with single unallocated shard', async () => {
        await indicesList.clickRowByName('phone-home');

        expect(await shards.getUnassignedIndexAllocation()).to.eql([
          { classification: 'shard replica unassigned 1', tooltip: 'Unassigned' },
        ]);

        expect(await shards.getAssignedIndexAllocationByNode('jUT5KdxfRbORSCWkb5zjmA')).to.eql({
          visibleText: 'whatever-01 | 0 | 2 | 3 | 4',
          shards: [
            { classification: 'shard primary started 0', tooltip: 'Started' },
            { classification: 'shard primary started 2', tooltip: 'Started' },
            { classification: 'shard primary started 3', tooltip: 'Started' },
            { classification: 'shard primary started 4', tooltip: 'Started' },
          ],
        });

        expect(await shards.getAssignedIndexAllocationByNode('xcP6ue7eRCieNNitFTT0EA')).to.eql({
          visibleText: 'whatever-02 | 1 | 2 | 3 | 4',
          shards: [
            { classification: 'shard primary started 1', tooltip: 'Started' },
            { classification: 'shard replica started 2', tooltip: 'Started' },
            { classification: 'shard replica started 3', tooltip: 'Started' },
            { classification: 'shard replica started 4', tooltip: 'Started' },
          ],
        });

        expect(await shards.getAssignedIndexAllocationByNode('bwQWH-7IQY-mFPpfoaoFXQ')).to.eql({
          visibleText: 'whatever-03 | 0',
          shards: [{ classification: 'shard replica started 0', tooltip: 'Started' }],
        });
      });
    });
  });
}
