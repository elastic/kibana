/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');
  const indicesList = getService('monitoringElasticsearchIndices');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe('Elasticsearch indices listing', () => {
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

    it('should have an Elasticsearch cluster summary with correct info', async () => {
      expect(await esClusterSummaryStatus.getContent()).to.eql({
        nodesCount: 'Nodes\n1',
        indicesCount: 'Indices\n19',
        memory: 'Memory\n267.7 MB / 676.8 MB',
        totalShards: 'Total shards\n46',
        unassignedShards: 'Unassigned shards\n23',
        documentCount: 'Documents\n4,535',
        dataSize: 'Data\n8.6 MB',
        health: 'Health: red',
      });
    });

    // Revisit once https://github.com/elastic/eui/issues/1322 is resolved
    it.skip('should show indices table with correct rows after sorting by Search Rate Desc', async () => {
      await indicesList.clickSearchCol();
      await indicesList.clickSearchCol();

      const rows = await indicesList.getRows();
      expect(rows.length).to.be(20);

      const indicesAll = await indicesList.getIndicesAll();

      const tableData = [
        { name: 'many-0006_gkuqbjonkjmg', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '4.08 /s', unassignedShards: '0', },
        { name: 'many-0008_amnscruqlsnu', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '4.08 /s', unassignedShards: '0', },
        { name: 'many-0010_dgnlpqtstfvi', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0012_jwomwdgfpisl', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0014_zrukbrvuluby', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0016_gyvtsyauoqqg', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0018_ipugjcmuagih', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0020_fqfovcnznbus', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0022_dqbcjopzejlk', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0024_rixhhwzyiczb', status: 'Health: green', documentCount: '1', dataSize: '3.7 KB', indexRate: '0 /s', searchRate: '1.95 /s', unassignedShards: '0', },
        { name: 'many-0001_clruksahirti', status: 'Health: Deleted / Closed', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: 'N/A', },
        { name: 'many-0002_emdkmgdeflno', status: 'Health: Deleted / Closed', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: 'N/A', },
        { name: 'many-0003_jbwrztjwhkjt', status: 'Health: Deleted / Closed', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: 'N/A', },
        { name: 'many-0004_wzgjkelqclur', status: 'Health: Deleted / Closed', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: 'N/A', },
        { name: 'many-0005_dnzzblxoumfe', status: 'Health: Deleted / Closed', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: 'N/A', },
        { name: 'many-0007_milycdknpycp', status: 'Health: red', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: '1', },
        { name: 'many-0009_reolfgzjjtvh', status: 'Health: red', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: '1', },
        { name: 'many-0011_xtkcmlwmxcov', status: 'Health: red', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: '1', },
        { name: 'many-0013_smjuwdkhpduv', status: 'Health: red', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: '1', },
        { name: 'many-0015_vwmrucgzvohb', status: 'Health: red', documentCount: '1', dataSize: '3.6 KB', indexRate: '0 /s', searchRate: '0 /s', unassignedShards: '1', },
      ];

      // check the all data in the table
      indicesAll.forEach((obj, index) => { // eslint-disable-line no-unused-vars
        expect(indicesAll[index].name).to.be(tableData[index].name);
        expect(indicesAll[index].status).to.be(tableData[index].status);
        expect(indicesAll[index].documentCount).to.be(tableData[index].documentCount);
        expect(indicesAll[index].dataSize).to.be(tableData[index].dataSize);
        expect(indicesAll[index].indexRate).to.be(tableData[index].indexRate);
        expect(indicesAll[index].searchRate).to.be(tableData[index].searchRate);
        expect(indicesAll[index].unassignedShards).to.be(tableData[index].unassignedShards);
      });
    });

    it('should filter for specific indices', async () => {
      await indicesList.setFilter('000');
      const rows = await indicesList.getRows();
      expect(rows.length).to.be(9);
      await indicesList.clearFilter();
    });

    it('should filter for non-existent index', async () => {
      await indicesList.setFilter('foobar');
      await indicesList.assertNoData();
      await indicesList.clearFilter();
    });
  });
}
