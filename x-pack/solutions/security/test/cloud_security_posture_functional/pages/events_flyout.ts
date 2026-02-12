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
  waitForEnrichPolicyCreated,
  executeEnrichPolicy,
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
    'networkEvents',
    'expandedFlyoutGraph',
    'timeline',
  ]);
  const networkEventsPage = pageObjects.networkEvents;
  const expandedFlyoutGraph = pageObjects.expandedFlyoutGraph;
  const timelinePage = pageObjects.timeline;

  describe('Security Network Page - Graph visualization', function () {
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
      // Using unload destroys index's alias of .alerts-security.alerts-default which causes a failure in other tests
      // Instead we delete all alerts from the index
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
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('1')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(3);

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
        'label(google.iam.admin.v1.CreateRole)ln(d417ea74f69263353ca1f98e8269b8a6)oe(1)oa(0)'
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
        'label(google.iam.admin.v1.CreateRole)ln(d417ea74f69263353ca1f98e8269b8a6)oe(1)oa(0)'
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

    it('expanded flyout - show event details', async () => {
      // Setting the timerange to fit the data and open the flyout for a specific alert
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('5')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'label(google.iam.admin.v1.CreateRole)ln(5)oe(1)oa(0)'
      );
      await networkEventsPage.flyout.assertPreviewPanelIsOpen('event');
    });

    it('expanded flyout - show grouped event details', async () => {
      // Navigate to events page with filters for specific event action and actor entity
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('1')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();

      // Add filter for actor entity
      await expandedFlyoutGraph.showSearchBar();
      await expandedFlyoutGraph.addFilter({
        field: 'user.entity.id',
        operation: 'is',
        value: 'admin3@example.com',
      });

      await pageObjects.header.waitUntilLoadingHasFinished();
      await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

      // Graph should render 5 nodes:
      // - 2 actor entity nodes
      // - 1 label node that groups 2 non-origin events
      // - 1 label node (the origin event, separated from the group) that contains 1 event and 1 alert
      // - 1 target entity node
      await expandedFlyoutGraph.assertGraphNodesNumber(5);
      // when we deduct alerts from the events count, this will become 1
      await expandedFlyoutGraph.assertGraphGroupNodesNumber(2);

      // Show event details from group node
      await expandedFlyoutGraph.showEventOrAlertDetails(
        'label(google.iam.admin.v1.CreateRole)ln(c6579aaf5457eee679bb88bc31162a3d)oe(0)oa(0)'
      );
      await networkEventsPage.flyout.assertPreviewPanelIsOpen('group');
      await networkEventsPage.flyout.assertPreviewPanelGroupedItemsNumber(2);
    });

    it('expanded flyout - test IP popover functionality', async () => {
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('1')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.addFilter({
        field: 'event.action',
        operation: 'is',
        value: 'google.iam.admin.v1.CreateRole',
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
      await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

      await expandedFlyoutGraph.clickOnIpsPlusButton();
      await expandedFlyoutGraph.assertIpsPopoverIsOpen();
      await expandedFlyoutGraph.assertIpsPopoverContainsIps(['10.0.0.1', '10.0.0.3']);
      await expandedFlyoutGraph.clickOnFirstIpInPopover();
      await expandedFlyoutGraph.assertPreviewPopoverIsOpen();
    });

    it('show related alerts', async () => {
      // Setting the timerange to fit the data and open the flyout for a specific alert
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('6')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertCalloutVisible();
      await expandedFlyoutGraph.dismissCallout();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'label(google.iam.admin.v1.CreateRole2)ln(528a070f7bdd4fdac70ee28fbe835f04)oe(1)oa(0)'
      );
      // An alert is always coupled with an event, so we open the group preview panel instead of the alert panel
      await networkEventsPage.flyout.assertPreviewPanelIsOpen('group');
      await networkEventsPage.flyout.assertPreviewPanelGroupedItemsNumber(2);
    });

    describe('ECS fields only', function () {
      // Entity store is initialized once at the parent level to avoid race conditions
      // Tests run sequentially: first v1 (ENRICH), then v2 (LOOKUP JOIN)
      before(async () => {
        // Clean up any leftover resources from previous runs
        await cleanupEntityStore({ supertest, logger });

        // Delete entity indices completely to start fresh
        try {
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
        it('expanded flyout - entity enrichment for multiple actors and targets', async () => {
          // Navigate to events page with the multi-actor multi-target event
          await networkEventsPage.navigateToNetworkEventsPage(
            `${networkEventsPage.getAbsoluteTimerangeFilter(
              '2024-09-01T00:00:00.000Z',
              '2024-09-02T00:00:00.000Z'
            )}&${networkEventsPage.getFlyoutFilter('MultiActorMultiTargetEvent123')}`
          );
          await networkEventsPage.waitForListToHaveEvents();

          await networkEventsPage.flyout.expandVisualizations();
          await networkEventsPage.flyout.assertGraphPreviewVisible();
          // Expected nodes:
          // - 1 grouped actor node (2 actors: multi-actor-1, multi-actor-2 - same Identity/GCP IAM User)
          // - 1 grouped storage node (2 buckets: target-bucket-1, target-bucket-2 - same Storage/GCP Storage Bucket)
          // - 1 grouped service node (2 service accounts: target-multi-service-1, target-multi-service-2 - same Service/GCP Service Account)
          // - 1 label node (actor group -> storage group and service group)
          const expectedNodes = 4;
          await networkEventsPage.flyout.assertGraphNodesNumber(expectedNodes);

          await expandedFlyoutGraph.expandGraph();
          await expandedFlyoutGraph.waitGraphIsLoaded();
          await expandedFlyoutGraph.assertGraphNodesNumber(expectedNodes);

          const actorNodeId = '71373527ad0e2cf75e214cd168630ad1';
          await expandedFlyoutGraph.assertNodeEntityTag(actorNodeId, 'Identity');
          await expandedFlyoutGraph.assertNodeEntityDetails(actorNodeId, 'GCP IAM User');

          const storageBucketNodeId = '8a748ce026512856f76bdc6304573f1c';
          await expandedFlyoutGraph.assertNodeEntityTag(storageBucketNodeId, 'Storage');
          await expandedFlyoutGraph.assertNodeEntityDetails(
            storageBucketNodeId,
            'GCP Storage Bucket'
          );

          const serviceNodeId = '0039c3b5dd064364a5f7edac77c2e158';
          await expandedFlyoutGraph.assertNodeEntityTag(serviceNodeId, 'Service');
          await expandedFlyoutGraph.assertNodeEntityDetails(serviceNodeId, 'GCP Service Account');
        });

        it('expanded flyout - MV_EXPAND deduplication: single label node for targets with different entity types', async () => {
          // This test verifies the fix for GitHub issue #245739
          // A single document with targets that have DIFFERENT entity types after enrichment
          // should create only ONE label node (not multiple) because they share the same document ID
          //
          // Document: MvExpandBugTest123
          // - Actor: mv-expand-test-actor@example.com (Identity/GCP IAM User)
          // - Target 1: mv-expand-target-identity (Identity/GCP IAM User)
          // - Target 2: mv-expand-target-storage (Storage/GCP Storage Bucket)
          //
          // Before fix: MV_EXPAND creates 2 rows, which after enrichment have different targetEntityType,
          // causing ESQL to create 2 separate groups -> 2 label nodes
          //
          // After fix: Both rows share the same labelNodeId (document ID "MvExpandBugTest123"),
          // so only ONE label node is created with edges to both targets

          await networkEventsPage.navigateToNetworkEventsPage(
            `${networkEventsPage.getAbsoluteTimerangeFilter(
              '2024-09-01T00:00:00.000Z',
              '2024-09-02T00:00:00.000Z'
            )}&${networkEventsPage.getFlyoutFilter('MvExpandBugTest123')}`
          );
          await networkEventsPage.waitForListToHaveEvents();

          await networkEventsPage.flyout.expandVisualizations();
          await networkEventsPage.flyout.assertGraphPreviewVisible();

          // Expected nodes with the fix:
          // - 1 actor node (mv-expand-test-actor@example.com - Identity/GCP IAM User)
          // - 1 target node (mv-expand-target-identity - Identity/GCP IAM User)
          // - 1 target node (mv-expand-target-storage - Storage/GCP Storage Bucket)
          // - 1 label node (shared by both edges because they come from the same document)
          //
          // Before the fix, this would incorrectly create 5 nodes (2 label nodes instead of 1)
          const expectedNodes = 4;
          await networkEventsPage.flyout.assertGraphNodesNumber(expectedNodes);

          await expandedFlyoutGraph.expandGraph();
          await expandedFlyoutGraph.waitGraphIsLoaded();
          await expandedFlyoutGraph.assertGraphNodesNumber(expectedNodes);

          // Verify actor node
          const actorNodeId = 'mv-expand-test-actor@example.com';
          await expandedFlyoutGraph.assertNodeEntityTag(actorNodeId, 'Identity');
          await expandedFlyoutGraph.assertNodeEntityDetails(actorNodeId, 'MvExpandTestActor');

          // Verify first target (Identity type)
          const identityTargetNodeId = 'mv-expand-target-identity';
          await expandedFlyoutGraph.assertNodeEntityTag(identityTargetNodeId, 'Identity');
          await expandedFlyoutGraph.assertNodeEntityDetails(
            identityTargetNodeId,
            'MvExpandTargetIdentity'
          );

          // Verify second target (Storage type - different from first target!)
          const storageTargetNodeId = 'mv-expand-target-storage';
          await expandedFlyoutGraph.assertNodeEntityTag(storageTargetNodeId, 'Storage');
          await expandedFlyoutGraph.assertNodeEntityDetails(
            storageTargetNodeId,
            'MvExpandTargetStorage'
          );

          // Verify the label node exists
          // Format: label(action)ln(labelNodeId)oe(isOrigin)oa(isOriginAlert)
          // The labelNodeId is the document ID since there's only one document
          const labelNodeId =
            'label(google.iam.admin.v1.MvExpandTest)ln(MvExpandBugTest123)oe(1)oa(0)';
          await expandedFlyoutGraph.assertNodeExists(labelNodeId);
        });
      };

      describe('via ENRICH policy (v1)', () => {
        before(async () => {
          // Load v1 entity data
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store'
          );

          // Wait for entity data to be fully indexed
          await waitForEntityDataIndexed({
            es,
            logger,
            retry,
            entitiesIndex: '.entities.v1.latest.security_*',
            expectedCount: 15,
          });

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
            expectedCount: 15,
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
