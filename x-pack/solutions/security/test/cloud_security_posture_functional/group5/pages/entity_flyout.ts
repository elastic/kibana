/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  waitForPluginInitialized,
  waitForEntityDataIndexed,
  dataViewRouteHelpersFactory,
  installEntityStoreV2,
  uninstallEntityStoreV2,
  waitForEntityStoreV2Running,
} from '../../../cloud_security_posture_api/utils';
import { testSubjectIds } from '../../constants/test_subject_ids';
import type { SecurityTelemetryFtrProviderContext } from '../../config.base';

const {
  VISUALIZATIONS_SECTION_HEADER_TEST_ID,
  VISUALIZATIONS_SECTION_CONTENT_TEST_ID,
  GRAPH_PREVIEW_CONTENT_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
} = testSubjectIds;

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: SecurityTelemetryFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header', 'expandedFlyoutGraph']);
  const expandedFlyoutGraph = pageObjects.expandedFlyoutGraph;

  describe('Security Entity Analytics - Entity Flyout Graph', function () {
    this.tags(['cloud_security_posture_graph_viz']);

    before(async () => {
      await waitForPluginInitialized({ retry, supertest, logger });

      await kibanaServer.uiSettings.update({
        'securitySolution:enableAssetInventory': true,
        'securitySolution:entityStoreEnableV2': true,
      });

      // Initialize security-solution-default data-view (required by entity store)
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution');

      // Install Entity Store V2 and initialize engines so the entities table is visible
      await installEntityStoreV2({ supertest, logger });
      await waitForEntityStoreV2Running({ supertest, retry, logger });
    });

    after(async () => {
      await uninstallEntityStoreV2({ supertest, logger });
      await kibanaServer.uiSettings.update({
        'securitySolution:enableAssetInventory': false,
        'securitySolution:entityStoreEnableV2': false,
      });
    });

    describe('entity relationships', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
        );

        await waitForEntityDataIndexed({
          es,
          logger,
          retry,
          entitiesIndex: '.entities.v2.latest.security_*',
          expectedCount: 46,
        });
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
        );
      });

      it('should group same-type actors and isolate the pinned origin actor (actor grouping & pinning)', async () => {
        // Scenario (matching the API integration test in graph.ts):
        // - origin-pinned-server (Linux Server / AWS EC2 Instance) is the origin entity.
        //   It is auto-pinned by the frontend when the entity flyout opens.
        //   It has a communicates_with relationship to relationship-target-server.
        // - grouped-actor-server-1 and grouped-actor-server-2 share the same type/subtype
        //   and both communicate with relationship-target-server.
        //   They should collapse into a single grouped relationship node.
        // - different-subtype-actor-server has a different subtype (GCP Compute Instance)
        //   and should produce its own separate relationship node.
        // - administers-target-server-admin (User / AWS IAM User) administers
        //   relationship-target-server, exercising a second relationship type (administers)
        //   on the same target — added to cover ENTITY_RELATIONSHIP_FIELDS growing past the
        //   ES|QL FORK 8-branch limit (see fetch_entity_relationships_graph.ts batching).
        //
        // Expected graph after opening the entity flyout for origin-pinned-server
        // and clicking "show entity relationships" on relationship-target-server:
        //   Entity nodes (5):
        //     - origin-pinned-server (solo, pinned as origin)
        //     - grouped-actor-server-1 + grouped-actor-server-2 (merged group, count=2)
        //     - different-subtype-actor-server (solo, different subtype)
        //     - administers-target-server-admin (solo, administers relationship)
        //     - relationship-target-server (target)
        //   Relationship nodes (4): one per distinct actor group/relationship type

        // Navigate directly to the entity analytics home page with the entity flyout
        // open for origin-pinned-server (host type). The flyout URL parameter opens
        // the flyout without needing to interact with the datagrid.
        await pageObjects.common.navigateToUrlWithBrowserHistory(
          'securitySolution',
          '/entity_analytics_home_page',
          `?cspq=(filters:!(),groupBy:!(none),pageFilters:!(),pageIndex:0,query:(language:kuery,query:%27%27),sort:!(!(%27@timestamp%27,desc)))&flyout=(preview:!(),right:(id:host-panel,params:(contextID:entity-analytics-home-table,entityId:%27host:origin-pinned-server%27,hostName:origin-pinned-server,scopeId:entity-analytics-home-table)))`,
          { ensureCurrentUrl: false }
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Wait for the host entity flyout right panel to open
        await testSubjects.existOrFail('rightSection', { timeout: 15000 });

        // Expand the Visualizations section in the flyout if it is collapsed
        // (same pattern as NetworkEventsPageObject.flyout.expandVisualizations)
        const vizContent = await testSubjects.find(VISUALIZATIONS_SECTION_CONTENT_TEST_ID);
        const isVizVisible = (await vizContent.getSize()).height > 0;
        if (!isVizVisible) {
          await testSubjects.click(VISUALIZATIONS_SECTION_HEADER_TEST_ID);
        }

        // Wait for the graph preview to appear, then expand to full view
        await testSubjects.existOrFail(GRAPH_PREVIEW_CONTENT_TEST_ID, { timeout: 10000 });
        await expandedFlyoutGraph.expandGraph();
        await expandedFlyoutGraph.waitGraphIsLoaded();

        // Initial graph: origin-pinned-server → (relationship-target-server as target entity from entityIds)
        // The origin entity is pinned automatically, so it appears as a solo node.

        // Show entity relationships for relationship-target-server
        await expandedFlyoutGraph.showEntityRelationships('host:relationship-target-server');
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // Assert 5 entity nodes: origin (solo), group of 2, different-subtype (solo),
        // administers-target-server-admin (solo), target
        await expandedFlyoutGraph.assertGraphNodesNumber(
          5 + // entity nodes
            4 // relationship nodes (one per actor group/relationship type)
        );

        // origin-pinned-server must exist as its own solo node (pinned, never merged)
        await expandedFlyoutGraph.assertNodeExists('host:origin-pinned-server');

        // relationship-target-server is the target
        await expandedFlyoutGraph.assertNodeExists('host:relationship-target-server');

        // different-subtype-actor-server appears as a solo node (different subtype)
        await expandedFlyoutGraph.assertNodeExists('host:different-subtype-actor-server');

        // administers-target-server-admin appears as a solo node (administers relationship,
        // different actor type from the communicates_with hosts)
        await expandedFlyoutGraph.assertNodeExists('user:administers-target-server-admin');

        // 4 relationship nodes: 3 with label "Communicates with", 1 with label "Administers"
        const relationshipNodeIds = [
          'rel(host:origin-pinned-server-communicates_with)',
          'rel(host:different-subtype-actor-server-communicates_with)',
          'rel(user:administers-target-server-admin-administers)',
        ];
        for (const nodeId of relationshipNodeIds) {
          await expandedFlyoutGraph.assertNodeExists(nodeId);
        }

        // The merged group node ID is the SHA-256 hash of the two actor IDs
        // (grouped-actor-server-1 and grouped-actor-server-2), stable across runs.
        const mergedGroupNodeId =
          '963a0686f85174e29eab1617a99b27256d5c627b666ea55e67aa3299d70c227e';
        await expandedFlyoutGraph.assertNodeExists(mergedGroupNodeId);

        // --- Phase 2: open the grouped node preview panel and show entity relationships
        //              for the first entity in the group ---
        // showEntityDetails clicks the node expand button then "Show entity details",
        // which opens the grouped preview panel listing both members.
        await expandedFlyoutGraph.showEntityDetails(mergedGroupNodeId);
        await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleLinkNumber(2);

        // Click the actions (⋯) button on the first entity row in the panel,
        // then select "Show entity relationships" from the popover.
        // This pins that entity so it splits out of the group into its own node.
        const groupedItemRows = await testSubjects.findAll(
          'GraphGroupedNodePreviewPanelGroupedItem'
        );
        const actionsBtn = await groupedItemRows[0].findByTestSubject(
          'GraphGroupedNodePreviewPanelGroupedItemActionsButton'
        );
        await actionsBtn.click();
        await testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // --- Phase 4: hide entity relationships from the same grouped panel row ---
        // The grouped panel is still open. Click the actions button on the same row
        // and select "Hide entity relationships" — this unpins the entity and it
        // merges back into the group.
        await actionsBtn.click();
        await testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Close the grouped preview panel and fit the graph into view
        await expandedFlyoutGraph.closePreviewSection();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // --- Phase 3+4 combined assertion ---
        // After hiding, the entity rejoins the group: back to the original 9 nodes
        //   Entity nodes (5): origin-pinned-server, merged-group (count=2),
        //                     different-subtype-actor-server, administers-target-server-admin,
        //                     target
        //   Relationship nodes (4): back to the original 4
        await expandedFlyoutGraph.assertGraphNodesNumber(5 + 4);
        await expandedFlyoutGraph.assertNodeExists(mergedGroupNodeId);
        await expandedFlyoutGraph.assertNodeExists('host:relationship-target-server');
        await expandedFlyoutGraph.assertNodeExists('host:origin-pinned-server');
        await expandedFlyoutGraph.assertNodeExists('host:different-subtype-actor-server');
        await expandedFlyoutGraph.assertNodeExists('user:administers-target-server-admin');
      });

      it('should group same-type targets and isolate a pinned target (target grouping & pinning)', async () => {
        // Scenario:
        // - platform-admin-role (IAM Role) supervises app-team-lead and db-team-lead.
        // - security-admin-group (IAM Group) supervises the same two targets.
        // - app-team-lead and db-team-lead share the same type/sub_type (User / AWS IAM User),
        //   so they collapse into a single grouped TARGET node.
        //
        // Phase 1 — open the entity flyout for platform-admin-role (the origin, auto-pinned):
        //   platform-admin-role → supervises → grouped[app-team-lead, db-team-lead]
        //
        // Phase 2 — open the grouped target preview and click "show entity relationships" on
        //   the first member (db-team-lead, which pins that target). Now security-admin-group is
        //   pulled in. The relationships query only returns rows touching the requested entity IDs
        //   (platform-admin-role and the pinned db-team-lead), so security-admin-group's edge to
        //   app-team-lead is filtered out. The resulting graph is:
        //   - platform-admin-role (pinned origin actor) → grouped[app-team-lead, db-team-lead]
        //     (the pinned origin's own targets stay grouped)
        //   - security-admin-group → db-team-lead (solo pinned target)

        // Navigate directly to the entity analytics home page with the entity flyout open for
        // platform-admin-role (user type).
        await pageObjects.common.navigateToUrlWithBrowserHistory(
          'securitySolution',
          '/entity_analytics_home_page',
          `?cspq=(filters:!(),groupBy:!(none),pageFilters:!(),pageIndex:0,query:(language:kuery,query:%27%27),sort:!(!(%27@timestamp%27,desc)))&flyout=(preview:!(),right:(id:user-panel,params:(contextID:entity-analytics-home-table,scopeId:entity-analytics-home-table,userName:platform-admin-role,entityId:%27user:platform-admin-role%27)))`,
          { ensureCurrentUrl: false }
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Wait for the user entity flyout right panel to open
        await testSubjects.existOrFail('rightSection', { timeout: 15000 });

        // Expand the Visualizations section in the flyout if it is collapsed
        const vizContent = await testSubjects.find(VISUALIZATIONS_SECTION_CONTENT_TEST_ID);
        const isVizVisible = (await vizContent.getSize()).height > 0;
        if (!isVizVisible) {
          await testSubjects.click(VISUALIZATIONS_SECTION_HEADER_TEST_ID);
        }

        // Wait for the graph preview to appear, then expand to full view
        await testSubjects.existOrFail(GRAPH_PREVIEW_CONTENT_TEST_ID, { timeout: 10000 });
        await expandedFlyoutGraph.expandGraph();
        await expandedFlyoutGraph.waitGraphIsLoaded();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // The merged TARGET group node ID is the SHA-256 hash of the two sorted target IDs
        // (user:app-team-lead and user:db-team-lead), stable across runs.
        const mergedTargetGroupNodeId =
          '386380dd630642e9f92ec82c7fed634b62981c3fd0c47bc97842f9887a5e9344';

        // Phase 1: platform-admin-role → supervises → grouped[app-team-lead, db-team-lead]
        //   Entity nodes (2): platform-admin-role (origin), merged target group (count=2)
        //   Relationship nodes (1): rel(platform-admin-role-supervises)
        await expandedFlyoutGraph.assertGraphNodesNumber(2 + 1);
        await expandedFlyoutGraph.assertNodeExists('user:platform-admin-role');
        await expandedFlyoutGraph.assertNodeExists(mergedTargetGroupNodeId);
        await expandedFlyoutGraph.assertNodeExists('rel(user:platform-admin-role-supervises)');

        // Phase 2: open the grouped target preview panel and show relationships of the first
        // member (pins it). showEntityDetails clicks the node expand button then
        // "Show entity details", opening the grouped preview panel listing both members.
        await expandedFlyoutGraph.showEntityDetails(mergedTargetGroupNodeId);
        await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleLinkNumber(2);

        // Click the actions (⋯) button on the first entity row in the panel, then select
        // "Show entity relationships" — this pins that target so it splits out of the group.
        const groupedItemRows = await testSubjects.findAll(
          'GraphGroupedNodePreviewPanelGroupedItem'
        );
        const actionsBtn = await groupedItemRows[0].findByTestSubject(
          'GraphGroupedNodePreviewPanelGroupedItemActionsButton'
        );
        await actionsBtn.click();
        await testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await expandedFlyoutGraph.closePreviewSection();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // Phase 2 assertions:
        //   Entity nodes (4): platform-admin-role, merged target group (count=2 — from the pinned
        //                     origin actor, its targets stay grouped), security-admin-group,
        //                     app-team-lead (solo, the pinned target)
        //   Relationship nodes (2): rel(platform-admin-role-supervises),
        //                           rel(security-admin-group-supervises)
        await expandedFlyoutGraph.assertGraphNodesNumber(4 + 2);

        // platform-admin-role (pinned origin actor) still points at the grouped target node
        await expandedFlyoutGraph.assertNodeExists('user:platform-admin-role');
        await expandedFlyoutGraph.assertNodeExists(mergedTargetGroupNodeId);
        await expandedFlyoutGraph.assertNodeExists('rel(user:platform-admin-role-supervises)');

        // security-admin-group is pulled in and supervises the pinned target as a SEPARATE solo
        // node. The pinned target (app-team-lead) can no longer merge with its same-type peer for
        // security-admin-group's edge, so it splits out into its own node.
        await expandedFlyoutGraph.assertNodeExists('user:security-admin-group');
        await expandedFlyoutGraph.assertNodeExists('rel(user:security-admin-group-supervises)');
        await expandedFlyoutGraph.assertNodeExists('user:app-team-lead');
        // db-team-lead does NOT appear as its own solo node — only app-team-lead was pinned; the
        // relationships query returns only rows touching the requested entity IDs, so db-team-lead
        // stays merged inside platform-admin-role's grouped target node.
        await expandedFlyoutGraph.assertNodeDoesNotExist('user:db-team-lead');

        // --- Phase 3: hide entity relationships of the same target to unpin it ---
        // Re-open the grouped target preview panel (it still lists both members, since
        // platform-admin-role's grouped node kept app-team-lead and db-team-lead together).
        // Select the same first member and click "Hide entity relationships" — this unpins
        // app-team-lead, which re-merges it with db-team-lead and removes security-admin-group
        // (it was only in the graph because of the pin).
        await expandedFlyoutGraph.showEntityDetails(mergedTargetGroupNodeId);
        await expandedFlyoutGraph.assertPreviewPanelGroupedItemTitleLinkNumber(2);

        const groupedItemRowsAfterPin = await testSubjects.findAll(
          'GraphGroupedNodePreviewPanelGroupedItem'
        );
        const hideActionsBtn = await groupedItemRowsAfterPin[0].findByTestSubject(
          'GraphGroupedNodePreviewPanelGroupedItemActionsButton'
        );
        await hideActionsBtn.click();
        await testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await expandedFlyoutGraph.closePreviewSection();
        await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

        // Back to the original 3 nodes:
        //   Entity nodes (2): platform-admin-role, merged target group (count=2)
        //   Relationship nodes (1): rel(platform-admin-role-supervises)
        await expandedFlyoutGraph.assertGraphNodesNumber(2 + 1);
        await expandedFlyoutGraph.assertNodeExists('user:platform-admin-role');
        await expandedFlyoutGraph.assertNodeExists(mergedTargetGroupNodeId);
        await expandedFlyoutGraph.assertNodeExists('rel(user:platform-admin-role-supervises)');
      });
    });
  });
}
