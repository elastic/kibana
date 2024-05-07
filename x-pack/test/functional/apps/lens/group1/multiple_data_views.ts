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
  const PageObjects = getPageObjects([
    'visualize',
    'lens',
    'header',
    'unifiedSearch',
    'dashboard',
    'timeToVisualize',
    'common',
    'discover',
    'unifiedFieldList',
  ]);
  const filterBar = getService('filterBar');
  const elasticChart = getService('elasticChart');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const dataViews = getService('dataViews');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  const expectedData = [
    { x: '97.220.3.248', y: 19755 },
    { x: '169.228.188.120', y: 18994 },
    { x: '78.83.247.30', y: 17246 },
    { x: '226.82.228.233', y: 15687 },
    { x: '93.28.27.24', y: 15614.33 },
    { x: 'Other', y: 5722.77 },
  ];

  function assertMatchesExpectedData(state: DebugState) {
    expect(
      state.bars![0].bars.map((bar) => ({
        x: bar.x,
        y: Math.floor(bar.y * 100) / 100,
      }))
    ).to.eql(expectedData);
  }

  describe('lens with multiple data views', () => {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await PageObjects.common.navigateToApp('lens');
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
    });

    it('should allow building a chart with multiple data views', async () => {
      PageObjects.lens.clickField('bytes');
      PageObjects.lens.createLayer('data');
    });

    it('ignores global filters on layers using a data view without the filter field by default', async () => {
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });
    });

    it('applies global filters on layers using data view a without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
    });
  });
}
