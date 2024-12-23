/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');

  describe('change point detection in dashboard', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    it('attaches change point charts to a dashboard from the ML app', async () => {
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();

      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      await aiops.changePointDetectionPage.selectSplitField(0, 'geoip.city_name');

      await aiops.changePointDetectionPage.assertPanelExist(0);
      await aiops.changePointDetectionPage.attachChartsToDashboard(0, {
        applyTimeRange: true,
        maxSeries: 1,
      });
    });
  });
}
