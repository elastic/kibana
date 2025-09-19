/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import type { LinkedDashboard, SuggestedDashboard } from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { SuggestedDashboardsClient } from './suggested_dashboards_client';
import { LinkedDashboardsClient } from './linked_dashboards_client';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;

export class RelatedDashboardsClient {
  private suggestedDashboardsClient: SuggestedDashboardsClient;
  private linkedDashboardsClient: LinkedDashboardsClient;

  constructor(
    logger: Logger,
    dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string,
    referencedPanelManager: ReferencedPanelManager
  ) {
    this.suggestedDashboardsClient = new SuggestedDashboardsClient(
      logger,
      dashboardClient,
      alertsClient,
      alertId,
      referencedPanelManager
    );

    this.linkedDashboardsClient = new LinkedDashboardsClient(logger, dashboardClient);
  }

  // fetch retrieves both suggested and linked dashboards
  public async fetch(): Promise<{
    suggestedDashboards: SuggestedDashboard[];
    linkedDashboards: LinkedDashboard[];
  }> {
    const alert = await this.alertsClient.getAlertById(this.alertId);
    if (!alert) {
      throw new Error(
        `Alert with id ${this.alertId} not found. Could not fetch related dashboards.`
      );
    }

    const ruleId = alert.getRuleId();
    if (!ruleId) {
      throw new Error(
        `Alert with id ${this.alertId} does not have a rule ID. Could not fetch linked dashboards.`
      );
    }
    const linkedDashboardIds = (
      (await this.alertsClient.getRuleById(ruleId))?.artifacts?.dashboards || []
    ).map((d) => d.id);

    const [suggestedDashboards, linkedDashboards] = await Promise.all([
      this.suggestedDashboardsClient.fetchSuggested(alert),
      this.linkedDashboardsClient.getLinkedDashboardsByIds(linkedDashboardIds),
    ]);

    const filteredSuggestedDashboards = suggestedDashboards
      .filter((suggested) => !linkedDashboards.some((linked) => linked.id === suggested.id))
      .slice(0, 10); // limit to 10 suggested dashboards

    return {
      suggestedDashboards: filteredSuggestedDashboards,
      linkedDashboards,
    };
  }
}
