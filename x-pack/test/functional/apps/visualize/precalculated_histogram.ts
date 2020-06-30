/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'visualize', 'discover', 'visChart', 'visEditor']);
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');

  describe('pre_calculated_histogram', function () {
    before(async function () {
      log.debug('Starting pre_calculated_histogram before method');
      await esArchiver.load('pre_calculated_histogram');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'test-histogram' });
    });

    after(function () {
      return esArchiver.unload('pre_calculated_histogram');
    });

    it('appears correctly in discover', async function () {
      await PageObjects.common.navigateToApp('discover');
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData.includes('"values": [ 0.3, 1, 3, 4.2, 4.8 ]')).to.be.ok();
    });

    describe('works in visualizations', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch('histogram-test');
        await PageObjects.visChart.waitForVisualization();
        await PageObjects.visEditor.clickMetricEditor();
      });

      const renderTableForAggregation = async (aggregation: string) => {
        await PageObjects.visEditor.selectAggregation(aggregation, 'metrics');
        await PageObjects.visEditor.selectField('histogram-content', 'metrics');
        await PageObjects.visEditor.clickGo();

        return await PageObjects.visChart.getTableVisContent();
      };

      it('with percentiles aggregation', async () => {
        const data = (await renderTableForAggregation('Percentiles')) as string[][];
        expect(data[0]).to.have.property('length', 7);
        // Percentile values are not deterministic, so we can't check for the exact values here,
        // but just check they are all within the given range
        // see https://github.com/elastic/elasticsearch/issues/49225
        expect(data[0].every((p: string) => Number(p) >= 0.3 && Number(p) <= 5)).to.be(true);
      });

      it('with percentile ranks aggregation', async () => {
        const data = await renderTableForAggregation('Percentile Ranks');
        expect(data).to.eql([['0%']]);
      });

      it('with average aggregation', async () => {
        const data = await renderTableForAggregation('Average');
        expect(data).to.eql([['2.8510720308359434']]);
      });

      it('with median aggregation', async () => {
        // Percentile values (which are used by median behind the scenes) are not deterministic,
        // so we can't check for the exact values here, but just check they are all within the given range
        // see https://github.com/elastic/elasticsearch/issues/49225
        const data = await renderTableForAggregation('Median');
        const value = Number(data[0][0]);
        expect(value).to.be.above(3.0);
        expect(value).to.be.below(3.3);
      });

      it('with sum aggregation', async () => {
        const data = await renderTableForAggregation('Sum');
        expect(data).to.eql([['11834.800000000001']]);
      });
    });
  });
}
