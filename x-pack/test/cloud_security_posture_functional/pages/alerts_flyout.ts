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
  const retry = getService('retry');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const ebtUIHelper = getService('kibana_ebt_ui');
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
      await ebtUIHelper.setOptIn(true); // starts the recording of events from this moment
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/cloud_security_posture_functional/es_archives/security_alerts'
      );
      await esArchiver.unload(
        'x-pack/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );
    });

    it('expanded flyout - filter by node', async () => {
      await alertsPage.flyout.expandVisualizations();

      await alertsPage.flyout.assertGraphPreviewVisible();
      await alertsPage.flyout.assertGraphNodesNumber(3);

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
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)'
      );
      await expandedFlyoutGraph.expectFilterTextEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );
      await expandedFlyoutGraph.expectFilterPreviewEquals(
        0,
        'actor.entity.id: admin@example.com OR target.entity.id: admin@example.com OR related.entity: admin@example.com OR event.action: google.iam.admin.v1.CreateRole'
      );

      // Hide events with the same action
      await expandedFlyoutGraph.hideEventsOfSameAction(
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)'
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
  });
}
