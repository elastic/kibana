/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const pageObjects = getPageObjects(['triggersActionsUI']);

  describe('anomaly detection alert', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('overview page alert flyout controls', () => {
      it('can open alert flyout', async () => {
        await ml.navigation.navigateToAlertsAndAction();
        await pageObjects.triggersActionsUI.clickCreateAlertButton();
        await ml.alerting.selectAnomalyDetectionAlertType();
      });
    });
  });
};
