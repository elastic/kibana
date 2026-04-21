/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  waitForPluginInitialized,
  dataViewRouteHelpersFactory,
  installEntityStoreV2,
  uninstallEntityStoreV2,
  waitForEntityStoreV2Running,
} from '../../../../../cloud_security_posture_api/utils';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../../services';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'header',
    'alerts',
    'expandedFlyoutGraph',
  ]);
  const alertsPage = pageObjects.alerts;
  let adminSupertest: SupertestWithRoleScopeType;

  describe('Security Alerts Page - Graph visualization in Serverless', function () {
    // See details: https://github.com/elastic/kibana/issues/208903
    this.tags(['failsOnMKI', 'cloud_security_posture_graph_viz']);

    before(async () => {
      adminSupertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });

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

      await waitForPluginInitialized({ retry, supertest: adminSupertest, logger });

      // Enable asset inventory and entity store v2 settings
      await kibanaServer.uiSettings.update({
        'securitySolution:enableAssetInventory': true,
        'securitySolution:entityStoreEnableV2': true,
      });

      // Initialize security-solution-default data-view (required by entity store)
      const dataView = dataViewRouteHelpersFactory(adminSupertest);
      await dataView.create('security-solution');

      // Install Entity Store V2 (required for graph visualization)
      await installEntityStoreV2({ supertest: adminSupertest, logger });
      await waitForEntityStoreV2Running({ supertest: adminSupertest, retry, logger });
    });

    after(async () => {
      await uninstallEntityStoreV2({ supertest: adminSupertest, logger });
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
      await adminSupertest.destroy();
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
