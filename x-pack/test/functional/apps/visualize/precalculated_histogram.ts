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

    const initHistogramBarChart = async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch('histogram-test');
      await PageObjects.visChart.waitForVisualization();
    };

    const getFieldOptionsForAggregation = async (aggregation: string): Promise<string[]> => {
      await PageObjects.visEditor.clickBucket('Y-axis', 'metrics');
      await PageObjects.visEditor.selectAggregation(aggregation, 'metrics');
      const fieldValues = await PageObjects.visEditor.getField();
      return fieldValues;
    };

    it('appears correctly in discover', async function () {
      await PageObjects.common.navigateToApp('discover');
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData.includes('"values": [ 0.3, 1, 3, 4.2, 4.8 ]')).to.be.ok();
    });

    it('appears in the field options of a Percentiles aggregation', async function () {
      await initHistogramBarChart();
      const fieldValues: string[] = await getFieldOptionsForAggregation('Percentiles');
      log.debug('Percentiles Fields = ' + fieldValues);
      expect(fieldValues[0]).to.be('histogram-content');
    });

    it('appears in the field options of a Percentile Ranks aggregation', async function () {
      const fieldValues: string[] = await getFieldOptionsForAggregation('Percentile Ranks');
      log.debug('Percentile Ranks Fields = ' + fieldValues);
      expect(fieldValues[0]).to.be('histogram-content');
    });
  });
}
