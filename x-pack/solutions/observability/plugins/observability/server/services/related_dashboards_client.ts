/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import { SearchResponse } from '@kbn/content-management-plugin/server/core/crud';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardPanel } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import type { LinkedDashboard, SuggestedDashboard } from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import { isSuggestedDashboardsValidPanelType } from './helpers';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { SuggestedMatchedBy } from '@kbn/observability-schema/related_dashboards/schema/related_dashboard/v1';

// How many managed dashboards to allow in the suggested list before we start filtering them out
const MAX_SUGGESTED_MANAGED_DASHBOARDS = 5;
const TEXT_MATCH_LIMIT = 5;
// TODO: We need to figure out a better way to handle this, hoping users have < 1000 dashboards is poor
// Ideally we would match by fields and indices simultaneously
const UNFILTERED_MATCH_LIMIT = 1000;

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;

export class RelatedDashboardsClient {
  public dashboardsById = new Map<string, Dashboard>();

  constructor(
    private logger: Logger,
    private dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string,
    private referencedPanelManager: ReferencedPanelManager
  ) {}

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

    const [suggestedDashboards, linkedDashboards] = await Promise.all([
      this.fetchSuggested(alert),
      this.getLinkedDashboards(ruleId),
    ]);

    const filteredSuggestedDashboards = suggestedDashboards.filter(
      (suggested) => !linkedDashboards.some((linked) => linked.id === suggested.id)
    );
    return {
      suggestedDashboards: filteredSuggestedDashboards.slice(0, 10), // limit to 10 suggested dashboards
      linkedDashboards,
    };
  }

  // fetchSuggested retrieves suggested dashboards using two sets of criteria:
  // 1. Unfiltered matches based on fields and indices present in the alert data.
  // 2. Full-text search matches based on the rule name associated with the alert.
  // The results from both searches are merged, scored, and sorted to provide a list of relevant dashboards.
  private async fetchSuggested(alert: AlertData): Promise<SuggestedDashboard[]> {
    // We're going to run two searches, storing the results in this map to dedup
    const dashboardsById = new Map<string, SuggestedDashboard>();
    await Promise.all(
      [
        this.unfilteredMatches(alert.getAllRelevantFields(), alert.getRuleQueryIndex() || ''),
        this.fetchSuggestedByTextMatch(alert.getRuleName() || ''),
      ].map(async (search) => {
        (await search).forEach((dashboard) => {
          const existing = dashboardsById.get(dashboard.id);
          if (!existing) {
            dashboardsById.set(dashboard.id, dashboard);
          } else {
            existing.matchedBy.fields.push(...(dashboard.matchedBy.fields || []));
            existing.matchedBy.index.push(...(dashboard.matchedBy.index || []));
            existing.matchedBy.textMatch =
              (existing.matchedBy.textMatch || 0) + (dashboard.matchedBy.textMatch || 0);
          }
        });
      })
    );

    // Return the dashboards sorted by score
    let matchedManagedDashboards = 0;
    return (
      Array.from(dashboardsById.values())
        // Compute and store the score for each dashboard, skipping any with a score of 0
        .flatMap((d) => ((d.score = scoreMatch(d.matchedBy)) > 0 ? d : []))
        .sort((a, b) => b.score - a.score)
        // Exclude managed dashboards if we already have MAX_SUGGESTED_MANAGED_DASHBOARDS matching
        .filter((d) =>
          d.matchedBy.isManaged
            ? ++matchedManagedDashboards <= MAX_SUGGESTED_MANAGED_DASHBOARDS
            : true
        )
    );
  }

  private async fetchSuggestedByTextMatch(ruleName: string): Promise<SuggestedDashboard[]> {
    // Return an empty array if the ruleName is an empty string or only whitespace
    if (!ruleName || /^\s*$/.test(ruleName)) {
      return [];
    }

    // First do a text search and set a base score based on the rank in the results
    // We ignore the actual ES score... because the SO client doesn't expose it, so just assume
    // that the top 5 results are decent enough and weight linearly
    const textMatches = await this.dashboardClient.search({
      text: ruleName,
      defaultSearchOperator: 'OR',
      limit: TEXT_MATCH_LIMIT,
    });
    await this.addToPanelManagerFromSearch(textMatches);

    const alert = await this.alertsClient.getAlertById(this.alertId);
    if (!alert) {
      return [];
    }
    const alertFields = alert.getAllRelevantFields();
    const alertIndex = alert.getRuleQueryIndex() || '';

    return textMatches.result.hits.map((dashboard, idx) => {
      // Combine text match with field and index matches
      const matchedBy = this.computeFieldAndIndexMatches(dashboard, alertFields, alertIndex);
      // Add text match score
      matchedBy.textMatch = textMatches.result.hits.length - idx;

      return dashboardToUnscoredSuggestedDashboard(dashboard, matchedBy);
    });
  }

  private async unfilteredMatches(
    alertFields: Set<string>,
    alertIndex: string
  ): Promise<SuggestedDashboard[]> {
    const unfilteredMatches = await this.dashboardClient.search({ limit: UNFILTERED_MATCH_LIMIT });
    await this.addToPanelManagerFromSearch(unfilteredMatches);
    return unfilteredMatches.result.hits.flatMap((dashboard) => {
      const matchedBy = this.computeFieldAndIndexMatches(dashboard, alertFields, alertIndex);

      if (matchedBy.fields.length === 0 || matchedBy.index.length === 0) {
        return []; // don't return dashboards that don't match any fields or indices
      }

      return dashboardToUnscoredSuggestedDashboard(dashboard, matchedBy);
    });
  }

  private computeFieldAndIndexMatches(
    dashboard: Dashboard,
    alertFields: Set<string>,
    alertIndex: string
  ): SuggestedMatchedBy {
    const matchedBy: SuggestedMatchedBy = {
      index: [],
      fields: [],
      textMatch: 0,
      isManaged: dashboard.managed || false,
    };

    const panels = dashboard.attributes.panels.filter(isDashboardPanel);

    // Aggregate all fields and indices from all panels
    for (const panel of panels) {
      this.referencedPanelManager.getPanelFields(panel).forEach((field) => {
        if (alertFields.has(field)) {
          matchedBy.fields?.push(field);
        }
      });

      this.referencedPanelManager
        .getPanelIndices(panel)
        .forEach(
          (index) =>
            alertIndex === index && !matchedBy.index.includes(index) && matchedBy.index?.push(index)
        );
    }

    return matchedBy;
  }

  private async addToPanelManagerFromSearch({ result: { hits } }: SearchResponse<Dashboard>) {
    for (const dashboard of hits) {
      for (const panel of dashboard.attributes.panels) {
        if (
          isDashboardPanel(panel) &&
          isSuggestedDashboardsValidPanelType(panel.type) &&
          (isEmpty(panel.panelConfig) || !panel.panelConfig.attributes)
        ) {
          this.referencedPanelManager.addReferencedPanel({ dashboard, panel });
        }
      }
    }

    await this.referencedPanelManager.fetchReferencedPanels();
  }

  private async getLinkedDashboards(ruleId: string): Promise<LinkedDashboard[]> {
    const rule = await this.alertsClient.getRuleById(ruleId);
    if (!rule) {
      throw new Error(
        `Rule with id ${ruleId} not found. Could not fetch linked dashboards for alert with id ${this.alertId}.`
      );
    }
    const linkedDashboardsArtifacts = rule.artifacts?.dashboards || [];
    const linkedDashboards = await this.getLinkedDashboardsByIds(
      linkedDashboardsArtifacts.map((d) => d.id)
    );
    return linkedDashboards;
  }

  private async getLinkedDashboardsByIds(ids: string[]): Promise<LinkedDashboard[]> {
    const linkedDashboardsResponse = await Promise.all(
      ids.map((id) => this.getLinkedDashboardById(id))
    );
    return linkedDashboardsResponse.filter((dashboard): dashboard is LinkedDashboard =>
      Boolean(dashboard)
    );
  }

  private async getLinkedDashboardById(id: string): Promise<LinkedDashboard | null> {
    try {
      const dashboardResponse = await this.dashboardClient.get(id);
      return {
        id: dashboardResponse.result.item.id,
        title: dashboardResponse.result.item.attributes.title,
        matchedBy: { linked: true },
        description: dashboardResponse.result.item.attributes.description,
        tags: dashboardResponse.result.item.attributes.tags,
      };
    } catch (error) {
      if (error.output.statusCode === 404) {
        this.logger.warn(`Linked dashboard with id ${id} not found. Skipping.`);
        return null;
      }
      throw new Error(`Error fetching dashboard with id ${id}: ${error.message || error}`);
    }
  }
}

function scoreMatch(matchedBy: SuggestedMatchedBy): number {
  // return a score of zero if there are no indices matched
  if (matchedBy.index.length === 0) {
    return 0;
  }

  // weight fields higher than indices
  let baseScore = 0;
  baseScore += matchedBy.fields.length * 3;
  baseScore += matchedBy.index.length;
  baseScore += matchedBy.textMatch * 5;

  // Penalize managed dashboards
  if (matchedBy.isManaged) {
    baseScore = baseScore * 0.25; // 75% penalty for managed dashboards
  }

  return baseScore;
}

// Converts a dashboard to a SuggestedDashboard without scoring
// This is useful for when we want to create a SuggestedDashboard without a score
// and then later score it based on the fields and indices it matches.
function dashboardToUnscoredSuggestedDashboard(
  dashboard: Dashboard,
  matchedBy: SuggestedMatchedBy
): SuggestedDashboard {
  const fullMatchedBy: SuggestedMatchedBy = matchedBy as SuggestedMatchedBy;
  fullMatchedBy.isManaged = dashboard.managed || false;
  return {
    id: dashboard.id,
    title: dashboard.attributes.title,
    description: dashboard.attributes.description,
    tags: dashboard.attributes.tags,
    matchedBy: fullMatchedBy,
    score: 0,
  };
}
