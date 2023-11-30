/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/172203
  describe.skip('change point detection', async function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    it(`loads the change point detection page`, async () => {
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();
    });

    it('detects a change point when no split field is selected', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      const result = await aiops.changePointDetectionPage.getTable(0).parseTable();
      expect(result.length).to.eql(1);
      expect(parseInt(result[0].pValue, 10)).to.eql(0);
      expect(result[0].type).to.eql('distribution_change');

      await elasticChart.waitForRenderComplete('aiopChangePointPreviewChart > xyVisChart');
      const chartState = await elasticChart.getChartDebugData(
        'aiopChangePointPreviewChart > xyVisChart',
        0,
        5000
      );
      if (!chartState) {
        throw new Error('Preview chart debug state is not available');
      }
      expect(chartState.annotations![0].data.details).to.eql('distribution_change');
      expect(chartState.annotations![0].domainType).to.eql('xDomain');
      expect(chartState.lines![0].points.length).to.be.above(30);
    });

    it('shows multiple results when split field is selected', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      await aiops.changePointDetectionPage.selectSplitField(0, 'geoip.city_name');
      await aiops.changePointDetectionPage.getTable(0).waitForTableToLoad();
      const result = await aiops.changePointDetectionPage.getTable(0).parseTable();
      // the aggregation may return different results (+-1)
      expect(result.length).to.be.above(5);
      // assert asc sorting by p_value is applied
      expect(parseFloat(result[0].pValue)).to.be.lessThan(parseFloat(result[4].pValue));
    });

    it('allows change point selection for detailed view', async () => {
      await aiops.changePointDetectionPage.getTable(0).selectAllRows();
      await aiops.changePointDetectionPage.viewSelected();
      await aiops.changePointDetectionPage.assertDetailedView(6);
      await aiops.changePointDetectionPage.closeFlyout();
      // deselect
      await aiops.changePointDetectionPage.getTable(0).selectAllRows();
    });

    it('supports a quick filter actions', async () => {
      await aiops.changePointDetectionPage
        .getTable(0)
        .invokeAction(0, 'aiopsChangePointFilterForValue');
      await aiops.changePointDetectionPage.getTable(0).waitForTableToLoad();
      const resultFor = await aiops.changePointDetectionPage.getTable(0).parseTable();
      expect(resultFor.length).to.eql(1);
    });

    it('supports multiple configurations for change point detection', async () => {
      await aiops.changePointDetectionPage.assertPanelExist(0);
      await aiops.changePointDetectionPage.addChangePointConfig();
      await aiops.changePointDetectionPage.assertPanelExist(1);
    });

    it('attaches change point charts to a dashboard', async () => {
      await aiops.changePointDetectionPage.assertPanelExist(0);
      await aiops.changePointDetectionPage.attachChartsToDashboard(0, {
        applyTimeRange: true,
        maxSeries: 1,
      });
    });
  });
}
