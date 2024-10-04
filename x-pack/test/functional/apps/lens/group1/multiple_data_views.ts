/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, visualize, lens } = getPageObjects(['common', 'visualize', 'lens']);
  const filterBar = getService('filterBar');
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  const expectedLogstashData = [
    { x: 1540278360000, y: 4735 },
    { x: 1540280820000, y: 2836 },
  ];
  const expectedFlightsData = [
    { x: 1540278720000, y: 12993.16 },
    { x: 1540279080000, y: 7927.47 },
    { x: 1540279500000, y: 7548.66 },
    { x: 1540280400000, y: 8418.08 },
    { x: 1540280580000, y: 11577.86 },
    { x: 1540281060000, y: 8088.12 },
    { x: 1540281240000, y: 6943.55 },
  ];

  function assertMatchesExpectedData(
    state: DebugState,
    expectedData: Array<Array<{ x: number; y: number }>>
  ) {
    expect(
      state?.bars?.map(({ bars }) =>
        bars.map((bar) => ({
          x: bar.x,
          y: Math.floor(bar.y * 100) / 100,
        }))
      )
    ).to.eql(expectedData);
  }

  describe('lens with multiple data views', () => {
    const visTitle = 'xyChart with multiple data views';

    before(async () => {
      await common.setTime({
        from: 'Oct 23, 2018 @ 07:00:00.000',
        to: 'Oct 23, 2018 @ 08:00:00.000',
      });

      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': true });

      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );

      await esArchiver.load('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
      await common.navigateToApp('lens');
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
    });

    it('should allow building a chart with multiple data views', async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      // Logstash layer
      await lens.switchDataPanelIndexPattern('long-window-logstash-*');
      await testSubjects.click('fieldToggle-bytes');

      // Flights layer
      await lens.switchDataPanelIndexPattern('kibana_sample_data_flights');
      await lens.createLayer('data');
      await testSubjects.click('fieldToggle-DistanceKilometers');

      const data = await lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data, [expectedLogstashData, expectedFlightsData]);
    });

    it('ignores global filters on layers using a data view without the filter field', async () => {
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data, [expectedLogstashData, expectedFlightsData]);
      await lens.save(visTitle);
    });

    it('applies global filters on layers using data view a without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
      await common.navigateToApp('visualize');
      await elasticChart.setNewChartUiDebugFlag(true);

      await visualize.openSavedVisualization(visTitle);
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data, [expectedFlightsData]);
    });
  });
}
