/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForPluginInitialized } from '../../cloud_security_posture_api/utils';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'header', 'alerts']);
  const alertsPage = pageObjects.alerts;

  describe('Security Alerts Page - Graph visualization', function () {
    this.tags(['cloud_security_posture_graph_viz']);

    before(async () => {
      await esArchiver.load(
        'x-pack/test/cloud_security_posture_functional/es_archives/security_alerts'
      );
      await esArchiver.load(
        'x-pack/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );

      await waitForPluginInitialized({ retry, supertest, logger });

      // Setting the timerange to fit the data and open the flyout for a specific alert
      await alertsPage.navigateToAlertsPage(
        `${alertsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${alertsPage.getFlyoutFilter(
          '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'
        )}`
      );

      await alertsPage.waitForListToHaveAlerts();

      await alertsPage.flyout.expandVisualizations();
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/cloud_security_posture_functional/es_archives/security_alerts'
      );
      await esArchiver.unload(
        'x-pack/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );
    });

    it('should render graph visualization', async () => {
      await alertsPage.flyout.assertGraphPreviewVisible();
      await alertsPage.flyout.assertGraphNodesNumber(3);
    });
  });
}
