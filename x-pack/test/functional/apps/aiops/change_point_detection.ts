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

  describe('change point detection', async function () {
    this.tags(['dima']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_ecommerce');
    });

    it(`loads the change point detection page`, async () => {
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToIndexPatternSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();
    });
  });
}
