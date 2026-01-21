/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import {
  waitForPluginInitialized,
  cleanupEntityStore,
  waitForEntityDataIndexed,
  executeEnrichPolicy,
  waitForEnrichPolicyCreated,
  dataViewRouteHelpersFactory,
  initEntityEnginesWithRetry,
} from '../../cloud_security_posture_api/utils';
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
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
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

      await expandedFlyoutGraph.showEntityDetails('5c6ec5af8800b6d061824c3b5d2282c2');
      // check the preview panel grouped items rendered correctly
      await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(4);
      await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleTextNumber(4);

      await expandedFlyoutGraph.closePreviewSection();
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
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(1)'
      );
      // An alert is always coupled with an event, so we open the group preview panel instead of the alert panel
      await alertsPage.flyout.assertPreviewPanelIsOpen('group');
      await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(3);

      // assert the grouped items are rendered correctly
      await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(3);
      await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleLinkNumber(3);
      await expandedFlyoutGraph.assertGroupedItemActorAndTargetValues(
        2,
        'admin@example.com',
        'projects/your-project-id/roles/customRole'
      );
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
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
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
      // Entity store is initialized once at the parent level to avoid race conditions
      // Tests run sequentially: first v1 (ENRICH), then v2 (LOOKUP JOIN)
      before(async () => {
        // Clean up any leftover resources from previous runs
        await cleanupEntityStore({ supertest, logger });

        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
        });

        try {
          // delete v2 index manually since its not being deleted by the cleanupEntityStore function
          await es.indices.delete({
            index: getEntitiesLatestIndexName(),
            ignore_unavailable: true,
          });
        } catch (e) {
          // Ignore if index doesn't exist
        }

        // Enable asset inventory setting
        await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });

        // Initialize security-solution-default data-view (required by entity store)
        const dataView = dataViewRouteHelpersFactory(supertest);
        await dataView.create('security-solution');

        // Initialize entity engine for 'generic' type ONCE - this is reused by both v1 and v2 tests
        await initEntityEnginesWithRetry({
          supertest,
          retry,
          logger,
          entityTypes: ['generic'],
        });

        // Load alerts data (shared by both v1 and v2 tests)
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_ecs_only_mappings'
        );
      });

      after(async () => {
        // Clean up entity store resources
        await cleanupEntityStore({ supertest, logger });

        // Disable asset inventory setting
        await kibanaServer.uiSettings.update({
          'securitySolution:enableAssetInventory': false,
        });
      });

      // Shared test suite that registers all test cases - called from both v1 and v2 describe blocks
      const runEnrichmentTests = () => {
        it('expanded flyout - entity enrichment for multiple generic targets - single target field', async () => {
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
          // We expect 5 nodes total in the graph:
          // 1. Actor node (serviceaccount@example.com - user)
          // 2. Grouped target node (3 service accounts grouped by same type/subtype)
          // 3. Entity node (api-service full path)
          // 4-5. Two label nodes
          await alertsPage.flyout.assertGraphNodesNumber(5);

          await expandedFlyoutGraph.expandGraph();
          await expandedFlyoutGraph.waitGraphIsLoaded();
          await expandedFlyoutGraph.assertGraphNodesNumber(5);
          await expandedFlyoutGraph.toggleSearchBar();

          // Test filter actions - Show actions by entity (user.entity.id)
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

          await expandedFlyoutGraph.showEntityDetails('4be3083f01620e3b7ad07ed171640ace');
          // check the preview panel grouped items rendered correctly
          await alertsPage.flyout.assertPreviewPanelGroupedItemsNumber(3);
          await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleLinkNumber(3);

          await expandedFlyoutGraph.closePreviewSection();

          // Clear filters to reset state
          await expandedFlyoutGraph.clearAllFilters();

          // Test custom filter in query bar
          await expandedFlyoutGraph.addFilter({
            field: 'user.entity.id',
            operation: 'is',
            value: 'serviceaccount@example.com',
          });
          await pageObjects.header.waitUntilLoadingHasFinished();
          await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

          // Open timeline to verify integration
          await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
          await timelinePage.ensureTimelineIsOpen();
          await timelinePage.waitForEvents();
          await timelinePage.closeTimeline();

          // Test query bar with KQL
          await expandedFlyoutGraph.setKqlQuery(
            'event.action: "google.iam.admin.v1.UpdateServiceAccount"'
          );
          await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
          await timelinePage.ensureTimelineIsOpen();
          await timelinePage.waitForEvents();
          await timelinePage.closeTimeline();

          // Test query bar with non-matching query
          await expandedFlyoutGraph.setKqlQuery('cannotFindThis');
          await expandedFlyoutGraph.clickOnInvestigateInTimelineButton();
          await timelinePage.ensureTimelineIsOpen();
          await timelinePage.waitForEvents();
        });

        it('expanded flyout - entity enrichment for service actor with multiple host targets - single target field', async () => {
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
            'Service'
          );
          await expandedFlyoutGraph.assertNodeEntityDetails(
            'api-service@your-project-id.iam.gserviceaccount.com',
            'ApiServiceAccount'
          );

          // Verify second entity node - Host target
          // get Node by md5 hash of host-instance-1 and host-instance-2
          await expandedFlyoutGraph.assertNodeEntityTag('599353ee39e688c8a37d9d2818d77898', 'Host');
          await expandedFlyoutGraph.assertNodeEntityDetails(
            '599353ee39e688c8a37d9d2818d77898',
            'GCP Compute Instance'
          );
        });
      };

      describe('via ENRICH policy (v1)', () => {
        before(async () => {
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store'
          );

          // Wait for entity data to be fully indexed
          await waitForEntityDataIndexed({
            es,
            logger,
            retry,
            entitiesIndex: '.entities.v1.latest.security_*',
            expectedCount: 12,
          });

          // Execute enrich policy to pick up entity data
          await waitForEnrichPolicyCreated({ es, retry, logger });
          await executeEnrichPolicy({ es, retry, logger });
        });

        runEnrichmentTests();
      });

      describe('via LOOKUP JOIN (v2)', () => {
        before(async () => {
          // Delete v2 manually since its not being deleted by the cleanupEntityStore function
          try {
            await es.indices.delete({
              index: getEntitiesLatestIndexName(),
              ignore_unavailable: true,
            });
          } catch (e) {
            // Ignore if index doesn't exist
          }

          // Load v2 entity data
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
          );

          // Wait for entity data to be fully indexed
          await waitForEntityDataIndexed({
            es,
            logger,
            retry,
            entitiesIndex: '.entities.v2.latest.security_*',
            expectedCount: 12,
          });
        });

        after(async () => {
          await esArchiver.unload(
            'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
          );
        });

        runEnrichmentTests();
      });
    });
  });
}
