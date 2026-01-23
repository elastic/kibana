/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'header',
    'alerts',
    'expandedFlyoutGraph',
  ]);
  const alertsPage = pageObjects.alerts;

  describe('Security Alerts Page - Graph visualization in Serverless', function () {
    // See details: https://github.com/elastic/kibana/issues/208903
    this.tags(['failsOnMKI', 'cloud_security_posture_graph_viz']);

    before(async () => {
      // Delete the alerts data stream to allow archive to recreate it with proper mappings
      // This is necessary in serverless where the data stream already exists
      try {
        await es.indices.deleteDataStream({
          name: '.alerts-security.alerts-default',
        });
      } catch (e) {
        // Ignore errors if data stream doesn't exist
      }

      // Load test data archives
      // security_alerts_modified_mappings contains actor/target mappings required for graph
      await esArchiver.load(
        'x-pack/solutions/security/test/serverless/functional/es_archives/security_alerts_modified_mappings'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/serverless/functional/es_archives/logs_gcp_audit'
      );
    });

    after(async () => {
      // Using unload destroys index's alias of .alerts-security.alerts-default which causes a failure in other tests
      // Instead we delete all alerts from the index
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await esArchiver.unload(
        'x-pack/solutions/security/test/serverless/functional/es_archives/logs_gcp_audit'
      );
    });

    describe('Editor role', () => {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsEditor();
      });

      it('should display graph visualization in alert flyout', async () => {
        // Navigate to alerts page with specific timerange and open alert flyout
        await alertsPage.navigateToAlertsPage(
          `${alertsPage.getAbsoluteTimerangeFilter(
            '2024-09-01T00:00:00.000Z',
            '2024-09-02T00:00:00.000Z'
          )}&${alertsPage.getFlyoutFilter(
            '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'
          )}`
        );

        // Expand visualizations section
        await alertsPage.flyout.expandVisualizations();

        // Verify graph preview is visible
        await alertsPage.flyout.assertGraphPreviewVisible();

        // Verify graph nodes are present (basic visibility check)
        await alertsPage.flyout.assertGraphNodesNumber(3);
      });
    });

    describe('Viewer role', () => {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
      });

      it('should display graph visualization in alert flyout', async () => {
        // Navigate to alerts page with specific timerange and open alert flyout
        await alertsPage.navigateToAlertsPage(
          `${alertsPage.getAbsoluteTimerangeFilter(
            '2024-09-01T00:00:00.000Z',
            '2024-09-02T00:00:00.000Z'
          )}&${alertsPage.getFlyoutFilter(
            '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'
          )}`
        );

        // Expand visualizations section
        await alertsPage.flyout.expandVisualizations();

        // Verify graph preview is visible
        await alertsPage.flyout.assertGraphPreviewVisible();

        // Verify graph nodes are present (basic visibility check)
        await alertsPage.flyout.assertGraphNodesNumber(3);
      });
    });
  });
}
