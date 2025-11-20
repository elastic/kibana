/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      await expandedFlyoutGraph.assertGraphNodesNumber(3);
      await expandedFlyoutGraph.toggleSearchBar();

      // Show actions by entity
      await expandedFlyoutGraph.showActionsByEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(0, 'actor.entity.id: admin@example.com');
      await expandedFlyoutGraph.expectFilterPreviewEquals(0, 'actor.entity.id: admin@example.com');

      // Show actions on entity
      await expandedFlyoutGraph.showActionsOnEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com'
      );

      // Explore related entities
      await expandedFlyoutGraph.exploreRelatedEntities('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Show events with the same action
      await expandedFlyoutGraph.showEventsOfSameAction(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(0)'
      );
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );

      await expandedFlyoutGraph.clickOnFitGraphIntoViewControl();

      // Hide events with the same action
      await expandedFlyoutGraph.hideEventsOfSameAction(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(0)'
      );
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Hide actions on entity
      await expandedFlyoutGraph.hideActionsOnEntity('admin@example.com');
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR related.entity: admin@example.com'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR related.entity: admin@example.com'
      );

      // Clear filters
      await expandedFlyoutGraph.clearAllFilters();

      // Add custom filter
      await expandedFlyoutGraph.addFilter({
        field: 'actor.entity.id',
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
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'a(admin4@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(1)oa(0)'
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

      // Add filter for actor entity
      await expandedFlyoutGraph.showSearchBar();
      await expandedFlyoutGraph.addFilter({
        field: 'actor.entity.id',
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
        'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)oe(0)oa(0)'
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
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.showEventOrAlertDetails(
        'a(admin6@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole2)oe(1)oa(0)'
      );
      // An alert is always coupled with an event, so we open the group preview panel instead of the alert panel
      await networkEventsPage.flyout.assertPreviewPanelIsOpen('group');
      await networkEventsPage.flyout.assertPreviewPanelGroupedItemsNumber(2);
    });
  });
}
