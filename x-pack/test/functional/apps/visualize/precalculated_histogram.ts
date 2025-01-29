/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const { common, visualize, discover, visChart, visEditor, unifiedFieldList } = getPageObjects([
    'common',
    'visualize',
    'discover',
    'visChart',
    'visEditor',
    'unifiedFieldList',
  ]);
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');

  describe('pre_calculated_histogram', function () {
    before(async function () {
      log.debug('Starting pre_calculated_histogram before method');
      await esArchiver.load('x-pack/test/functional/es_archives/pre_calculated_histogram');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'test-histogram' });
    });

    after(function () {
      return esArchiver.unload('x-pack/test/functional/es_archives/pre_calculated_histogram');
    });

    it('appears correctly in discover', async function () {
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.clickFieldListItemAdd('histogram-content');
      const rowData = await discover.getDocTableIndex(1);
      expect(rowData).to.contain('"values":[0.3,1,3,4.2,4.8]');
    });

    describe('works in visualizations', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickDataTable();
        await visualize.clickNewSearch('histogram-test');
        await visChart.waitForVisualization();
        await visEditor.clickMetricEditor();
      });

      const renderTableForAggregation = async (aggregation: string) => {
        await visEditor.selectAggregation(aggregation, 'metrics');
        await visEditor.selectField('histogram-content', 'metrics');
        await visEditor.clickGo();

        return visChart.getTableVisContent();
      };

      it('with percentiles aggregation', async () => {
        const data = (await renderTableForAggregation('Percentiles')) as string[][];
        expect(data[0]).to.have.property('length', 7);
        // Percentile values are not deterministic, so we can't check for the exact values here,
        // but just check they are all within the given range
        expect(data[0].every((p: string) => Number(p) >= 0.3 && Number(p) <= 5)).to.be(true);
      });

      it('with percentile ranks aggregation', async () => {
        const data = await renderTableForAggregation('Percentile Ranks');
        expect(data).to.eql([['0%']]);
      });

      it('with average aggregation', async () => {
        const data = await renderTableForAggregation('Average');
        expect(data).to.eql([['2.865']]);
      });

      it('with median aggregation', async () => {
        const data = await renderTableForAggregation('Median');
        const value = Number(data[0][0]);
        // Percentile values are not deterministic, so we can't check for the exact values here,
        // but just check they are all within the given range
        expect(value).to.be.above(2.9);
        expect(value).to.be.below(3.1);
      });

      it('with sum aggregation', async () => {
        const data = await renderTableForAggregation('Sum');
        expect(data).to.eql([['10,983']]);
      });
    });
  });
}
