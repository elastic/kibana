/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import { waitForPluginInitialized } from '../../cloud_security_posture_api/utils';
import type { SecurityTelemetryFtrProviderContext } from '../config';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: SecurityTelemetryFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'header',
    'alerts',
    'expandedFlyoutGraph',
    'timeline',
  ]);
  const alertsPage = pageObjects.alerts;
  const expandedFlyoutGraph = pageObjects.expandedFlyoutGraph;
  const timelinePage = pageObjects.timeline;

  describe('Security Alerts Page - Graph visualization', function () {
    this.tags(['cloud_security_posture_graph_viz']);

    before(async () => {
      // security_alerts_modified_mappings - contains mappings for actor and target
      // security_alerts - does not contain mappings for actor and target
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_modified_mappings'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );

      await waitForPluginInitialized({ retry, supertest, logger });
      await ebtUIHelper.setOptIn(true); // starts the recording of events from this moment
    });

    after(async () => {
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await esArchiver.unload(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );
    });

    it('expanded flyout - filter by node', async () => {
      // Setting the timerange to fit the data and open the flyout for a specific alert
      await alertsPage.navigateToAlertsPage(
        `${alertsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${alertsPage.getFlyoutFilter(
          '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'
        )}`
      );
      await alertsPage.waitForListToHaveAlerts(20000);

      await alertsPage.flyout.expandVisualizations();
      await alertsPage.flyout.assertGraphPreviewVisible();
      await alertsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);
      await expandedFlyoutGraph.toggleSearchBar();

      // Show actions by entity
      await expandedFlyoutGraph.showActionsByEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(0, 'user.entity.id: admin@example.com');
      await expandedFlyoutGraph.expectFilterPreviewEquals(0, 'user.entity.id: admin@example.com');

      // Show actions on entity
      await expandedFlyoutGraph.showActionsOnEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com'
      );

      // Explore related entities
      await expandedFlyoutGraph.exploreRelatedEntities('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Show events with the same action
      await expandedFlyoutGraph.showEventsOfSameAction(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(1)'
      );
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );

      await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

      // Hide events with the same action
      await expandedFlyoutGraph.hideEventsOfSameAction(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(1)'
      );
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'user.entity.id: admin@example.com OR user.target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Hide actions on entity
      await expandedFlyoutGraph.hideActionsOnEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'user.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'user.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Clear filters
      await expandedFlyoutGraph.clearAllFilters();

      // Add custom filter
      await expandedFlyoutGraph.addFilter({
        field: 'user.entity.id',
        operation: 'is',
        value: 'admin2@example.com',
      });
      await pageObjects.header.waitUntilLoadingHasFinished();

      await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();
      await expandedFlyoutGraph.assertGraphNodesNumber(5);

      // Open timeline
      await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
      await timelinePage.ensureTimelineIsOpen();
      await timelinePage.waitForEvents();
      await timelinePage.closeTimeline();

      // Test query bar
      await expandedFlyoutGraph.setKqlQuery('cannotFindThis');
      await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
      await timelinePage.ensureTimelineIsOpen();
      await timelinePage.waitForEvents();
    });

    it('expanded flyout - show alert details', async () => {
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
      await alertsPage.flyout.assertGraphPreviewVisible();
      await alertsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(1)'
      );
      // An alert is always coupled with an event, so we open the group preview panel instead of the alert panel
      await alertsPage.flyout.assertPreviewPanelIsOpen('group');
      await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(3);
    });

    it('show related alerts', async () => {
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
      await alertsPage.flyout.assertGraphPreviewVisible();
      await alertsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showActionsOnEntity('projects/your-project-id/roles/customRole');

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'a(admin6@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole2)oe(0)oa(0)'
      );
      // An alert is always coupled with an event, so we open the group preview panel instead of the alert panel
      await alertsPage.flyout.assertPreviewPanelIsOpen('group');
      await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(2);
    });

    describe('ECS fields only', function () {
      const entitiesIndex = '.entities.v1.latest.security_*';
      const enrichPolicyName = getEnrichPolicyId(); // defaults to 'default' space
      const enrichIndexName = `.enrich-${enrichPolicyName}`;

      /**
       * Helper to clean up entity store resources
       */
      const cleanupEntityStore = async () => {
        try {
          await supertest
            .delete('/api/entity_store/engines/generic?data=true')
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
          logger.debug('Deleted entity store engine');
        } catch (e) {
          // Ignore 404 errors if the engine doesn't exist
          if (e.status !== 404) {
            logger.debug(`Error deleting entity store engine: ${e.message || JSON.stringify(e)}`);
          }
        }
      };

      /**
       * Helper to wait for enrich index to be populated
       */
      const waitForEnrichIndexPopulated = async () => {
        await retry.waitFor('enrich index to be created and populated', async () => {
          try {
            const count = await es.count({
              index: enrichIndexName,
            });
            logger.debug(`Enrich index count: ${count.count}`);
            return count.count > 0;
          } catch (e) {
            logger.debug(`Waiting for enrich index: ${e.message}`);
            return false;
          }
        });
      };

      before(async () => {
        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
        });

        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_ecs_only_mappings'
        );

        // Clean up any leftover resources from previous runs
        await cleanupEntityStore();

        // Enable asset inventory setting
        await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });

        // CRITICAL: Load entity data BEFORE enabling asset inventory
        // Otherwise the enrich policy will execute with no data
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store'
        );

        // Wait for entity data to be fully indexed
        await retry.waitFor('entity data to be indexed', async () => {
          try {
            const response = await es.count({
              index: entitiesIndex,
            });
            logger.debug(`Entity count: ${response.count}`);
            return response.count === 3;
          } catch (e) {
            logger.debug(`Error counting entities: ${e.message}`);
            return false;
          }
        });

        // Enable asset inventory which creates the enrich policy
        await supertest
          .post('/api/asset_inventory/enable')
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(200);

        // Wait for enrich index to be created and populated with data
        await waitForEnrichIndexPopulated();
      });

      after(async () => {
        // Clean up entity store resources
        await cleanupEntityStore();

        // Disable asset inventory setting
        await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': false });

        // Unload the entity store archive
        try {
          await esArchiver.unload(
            'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store'
          );
        } catch (e) {
          logger.debug(`Error unloading entity store archive: ${e.message}`);
        }
      });

      it('expanded flyout - new ECS schema fields (user.entity.id, entity.target.id)', async () => {
        await alertsPage.navigateToAlertsPage(
          `${alertsPage.getAbsoluteTimerangeFilter(
            '2024-09-01T00:00:00.000Z',
            '2024-09-02T00:00:00.000Z'
          )}&${alertsPage.getFlyoutFilter(
            'new-schema-alert-789xyz456abc123def789ghi012jkl345mno678pqr901stu234vwx567'
          )}`
        );
        await alertsPage.waitForListToHaveAlerts();

        await alertsPage.flyout.expandVisualizations();
        await alertsPage.flyout.assertGraphPreviewVisible();
        await alertsPage.flyout.assertGraphNodesNumber(3);

        await expandedFlyoutGraph.expandGraph();
        await expandedFlyoutGraph.waitGraphIsLoaded();
        await expandedFlyoutGraph.assertGraphNodesNumber(3);
        await expandedFlyoutGraph.toggleSearchBar();

        // Show actions by entity (user.entity.id)
        await expandedFlyoutGraph.showActionsByEntity('serviceaccount@example.com');
        await expandedFlyoutGraph.showSearchBar();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com'
        );

        // Show actions on entity (entity.target.id)
        await expandedFlyoutGraph.showActionsOnEntity(
          'projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com'
        );
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com'
        );

        // Explore related entities
        await expandedFlyoutGraph.exploreRelatedEntities('serviceaccount@example.com');
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com'
        );

        // Show events with the same action
        await expandedFlyoutGraph.showEventsOfSameAction(
          'a(serviceaccount@example.com)-b(projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com)label(google.iam.admin.v1.UpdateServiceAccount)oe(1)oa(1)'
        );
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com OR event.action: google.iam.admin.v1.UpdateServiceAccount'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com OR event.action: google.iam.admin.v1.UpdateServiceAccount'
        );

        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // Hide events with the same action
        await expandedFlyoutGraph.hideEventsOfSameAction(
          'a(serviceaccount@example.com)-b(projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com)label(google.iam.admin.v1.UpdateServiceAccount)oe(1)oa(1)'
        );
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR entity.target.id: projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com OR related.entity: serviceaccount@example.com'
        );

        // Hide actions on entity
        await expandedFlyoutGraph.hideActionsOnEntity(
          'projects/your-project-id/serviceAccounts/api-service@your-project-id.iam.gserviceaccount.com'
        );
        await expandedFlyoutGraph.expectFilterTextEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR related.entity: serviceaccount@example.com'
        );
        await expandedFlyoutGraph.expectFilterPreviewEquals(
          0,
          'user.entity.id: serviceaccount@example.com OR related.entity: serviceaccount@example.com'
        );

        // Clear filters
        await expandedFlyoutGraph.clearAllFilters();

        // Add custom filter
        await expandedFlyoutGraph.addFilter({
          field: 'user.entity.id',
          operation: 'is',
          value: 'serviceaccount@example.com',
        });
        await pageObjects.header.waitUntilLoadingHasFinished();

        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();
        await expandedFlyoutGraph.assertGraphNodesNumber(5);

        // Open timeline
        await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
        await timelinePage.ensureTimelineIsOpen();
        await timelinePage.waitForEvents();
        await timelinePage.closeTimeline();

        // Test query bar
        await expandedFlyoutGraph.setKqlQuery('cannotFindThis');
        await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
        await timelinePage.ensureTimelineIsOpen();
        await timelinePage.waitForEvents();
      });

      it('should show entity enrichment for service actor with multiple host targets', async () => {
        // Navigate to alerts page with the multi-target alert
        await alertsPage.navigateToAlertsPage(
          `${alertsPage.getAbsoluteTimerangeFilter(
            '2024-09-01T00:00:00.000Z',
            '2024-09-02T00:00:00.000Z'
          )}&${alertsPage.getFlyoutFilter(
            'multi-target-alert-id-xyz123abc456def789ghi012jkl345mno678pqr901stu234'
          )}`
        );
        await alertsPage.waitForListToHaveAlerts();

        await alertsPage.flyout.expandVisualizations();
        await alertsPage.flyout.assertGraphPreviewVisible();
        // Should have 1 service actor (1 node) + 2 host targets grouped (1 node) + 1 label (1 node) = 3 nodes
        await alertsPage.flyout.assertGraphNodesNumber(3);

        await expandedFlyoutGraph.expandGraph();
        await expandedFlyoutGraph.waitGraphIsLoaded();
        await expandedFlyoutGraph.assertGraphNodesNumber(3);

        // Verify first entity node - Service actor
        await expandedFlyoutGraph.assertNodeEntityTag(
          'api-service@your-project-id.iam.gserviceaccount.com',
          'service'
        );
        await expandedFlyoutGraph.assertNodeEntityDetails(
          'api-service@your-project-id.iam.gserviceaccount.com',
          'GCP Service Account'
        );

        // Verify second entity node - Host target
        await expandedFlyoutGraph.assertNodeEntityTag('host-instance-1', 'host');
        await expandedFlyoutGraph.assertNodeEntityDetails(
          'host-instance-1',
          'GCP Compute Instance'
        );
      });
    });
  });
}
