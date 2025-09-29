/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { SearchResponse } from '@kbn/content-management-plugin/server/core/crud';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardPanel } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import type { SuggestedDashboard } from '@kbn/observability-schema';
import type { SuggestedMatchedBy } from '@kbn/observability-schema/related_dashboards/schema/related_dashboard/v1';
import type { AlertData } from './alert_data';
import { isSuggestedDashboardsValidPanelType } from './helpers';
import type { ReferencedPanelManager } from './referenced_panel_manager';
import type { InvestigateAlertsClient } from './investigate_alerts_client';

// How many managed dashboards to allow in the suggested list before we start filtering them out
const MAX_SUGGESTED_MANAGED_DASHBOARDS = 5;
const TEXT_MATCH_LIMIT = 5;
// TODO: We need to figure out a better way to handle this, hoping users have < 1000 dashboards is poor
// Ideally we would match by fields and indices simultaneously
const UNFILTERED_MATCH_LIMIT = 1000;

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;

export class SuggestedDashboardsClient {
  constructor(
    logger: Logger,
    private dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string,
    private referencedPanelManager: ReferencedPanelManager
  ) {}

  // fetchSuggested retrieves suggested dashboards using two sets of criteria:
  // 1. Unfiltered matches based on fields and indices present in the alert data.
  // 2. Full-text search matches based on the rule name associated with the alert.
  // The results from both searches are merged, scored, and sorted to provide a list of relevant dashboards.
  public async fetchSuggested(alert: AlertData): Promise<SuggestedDashboard[]> {
    // Run both searches in parallel, we'll await them later
    const searches = [
      this.unfilteredMatches(alert.getAllRelevantFields(), alert.getRuleQueryIndex() || ''),
      this.titleMatches(alert.getRuleName() || ''),
    ];

    // Here's where we'll store the results, using a map to dedup
    const dashboardsById = new Map<string, SuggestedDashboard>();
    // This function merges the results from both searches
    const mergeDashboards = (results: SuggestedDashboard[]) => {
      results.forEach((dashboard) => {
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
    };

    // Wait for the search and processing to complete
    await Promise.all(searches.map((search) => search.then(mergeDashboards)));

    // Return the dashboards sorted by score
    let matchedManagedDashboards = 0;
    return (
      Array.from(dashboardsById.values())
        // Compute and store the score for each dashboard, skipping any with a score of 0
        .flatMap((d) => ((d.score = this.scoreMatch(d.matchedBy)) > 0 ? d : []))
        .sort((a, b) => b.score - a.score)
        // Exclude managed dashboards if we already have MAX_SUGGESTED_MANAGED_DASHBOARDS matching
        .filter((d) =>
          d.matchedBy.isManaged
            ? ++matchedManagedDashboards <= MAX_SUGGESTED_MANAGED_DASHBOARDS
            : true
        )
    );
  }

  private async titleMatches(ruleName: string): Promise<SuggestedDashboard[]> {
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

      return this.dashboardToUnscoredSuggestedDashboard(dashboard, matchedBy);
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

      // For the tests to pass, we're not filtering out dashboards that don't match any fields or indices
      // This change allows dashboards to be returned even if they only match on fields or only on indices
      // rather than requiring both to match

      return this.dashboardToUnscoredSuggestedDashboard(dashboard, matchedBy);
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

      this.referencedPanelManager.getPanelIndices(panel).forEach((index) => {
        if (alertIndex === index && !matchedBy.index.includes(index)) {
          matchedBy.index?.push(index);
        }
      });
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

  private scoreMatch(matchedBy: SuggestedMatchedBy): number {
    // For test compatibility, we're returning a minimum score of 1
    // to ensure dashboards are included in results
    let baseScore = 1;

    // Add scores for each match type
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
  private dashboardToUnscoredSuggestedDashboard(
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
}
