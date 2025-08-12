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
import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { LinkedDashboard, SuggestedDashboard } from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import { SuggestedDashboardsValidPanelType, isSuggestedDashboardsValidPanelType } from './helpers';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { SuggestedMatchedBy } from '@kbn/observability-schema/related_dashboards/schema/related_dashboard/v1';

// How many managed dashboards to allow in the suggested list before we start filtering them out
const MAX_SUGGESTED_MANAGED_DASHBOARDS = 5;
// TODO: This is is missing many fields most likely, add more during review
const SCORING_EXCLUDED_FIELDS = new Set<string>([
  'tags',
  'labels',
  'event.action',
  'event.kind',
  '@timestamp',
  '__records__',
]);
const TEXT_MATCH_LIMIT = 5;
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

  public async fetchRelatedDashboards(): Promise<{
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

  private getPanelIndices(panel: DashboardPanel): Set<string> | undefined {
    let references = isLensVizAttributesForPanel(panel.panelConfig.attributes)
      ? panel.panelConfig.attributes.references
      : undefined;
    if (!references && panel.panelIndex) {
      references = this.referencedPanelManager.getByIndex(panel.panelIndex)?.references;
    }
    if (references?.length) {
      return new Set(
        references.filter((r) => r.name.match(`indexpattern`)).map((reference) => reference.id)
      );
    }
  }

  private async fetchSuggested(alert: AlertData): Promise<SuggestedDashboard[]> {
    // First do a text search and set a base score based on the rank in the results
    // We ignore the actual ES score... because the SO client doesn't expose it, so just assume
    // that the top 5 results are decent enough and weight linearly
    const textMatches = await this.dashboardClient.search({
      text: alert.getRuleName(), // TODO handle empty strings
      defaultSearchOperator: 'OR',
      limit: TEXT_MATCH_LIMIT,
    });
    await this.processDashboardPanels(textMatches);
    const dashboardsById = new Map<string, SuggestedDashboard>();
    textMatches.result.hits.forEach((dashboard, idx) =>
      dashboardsById.set(
        dashboard.id,
        dashboardToUnscoredSuggestedDashboard(dashboard, {
          // Score these dashboards exclusively as text matches
          textMatch: textMatches.result.hits.length - idx,
        })
      )
    );

    // Now match by fields and indices, these will use the previous score as a multiplier if relevant
    const unfilteredMatches = await this.dashboardClient.search({ limit: UNFILTERED_MATCH_LIMIT });
    await this.processDashboardPanels(unfilteredMatches);
    unfilteredMatches.result.hits.forEach((dashboard) => {
      const matchedBy: SuggestedMatchedBy = {};
      const panels = dashboard.attributes.panels.filter(isDashboardPanel);
      for (const panel of panels) {
        const panelIndices = this.getPanelIndices(panel);
        if (panelIndices) {
          matchedBy.index = Array.from(panelIndices);
        }
        const panelFields = this.getPanelFields(panel);
        if (panelFields) {
          matchedBy.fields = Array.from(panelFields);
        }
      }

      // Check if the dashboard was already scored by text match
      let d =
        dashboardsById.get(dashboard.id) || dashboardToUnscoredSuggestedDashboard(dashboard, {});
      d.matchedBy.fields = matchedBy.fields || [];
      d.matchedBy.index = matchedBy.index || [];
    });

    // Score all dashboards
    for (const dashboard of dashboardsById.values()) {
      if (
        dashboard.matchedBy.fields?.length ||
        dashboard.matchedBy.index?.length ||
        dashboard.matchedBy.textMatch
      ) {
        dashboard.score = scoreMatch(
          dashboard.matchedBy,
          dashboard.matchedBy.fields || [],
          dashboard.matchedBy.index || []
        );
      }
    }

    // Return the dashboards sorted by score
    let matchedManagedDashboards = 0;
    return (
      Array.from(dashboardsById.values())
        .sort((a, b) => b.score - a.score)
        // Exclude managed dashboards if we already have MAX_SUGGESTED_MANAGED_DASHBOARDS matching
        .filter((d) =>
          d.matchedBy.isManaged
            ? ++matchedManagedDashboards <= MAX_SUGGESTED_MANAGED_DASHBOARDS
            : true
        )
    );
  }

  private async processDashboardPanels(dsr: SearchResponse<Dashboard>) {
    const {
      result: { hits },
    } = dsr;
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

  private getPanelFields(panel: DashboardPanel): string[] {
    if (panel.type !== 'lens') {
      return [];
    }

    let state: unknown = isLensVizAttributesForPanel(panel.panelConfig.attributes)
      ? panel.panelConfig.attributes.state
      : undefined;
    if (!state && panel.panelIndex) {
      state = this.referencedPanelManager.getByIndex(panel.panelIndex)?.state;
    }
    if (isLensAttributesState(state)) {
      const fields: string[] = [];
      const dataSourceLayers = state.datasourceStates.formBased?.layers || {};
      Object.values(dataSourceLayers).forEach((ds) => {
        const columns = ds.columns;
        Object.values(columns).forEach((col) => {
          if ('sourceField' in col) {
            fields.push(col.sourceField);
          }
        });
      });
      return fields;
    }
    return [];
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

function isLensVizAttributesForPanel(attributes: unknown): attributes is LensAttributes {
  if (!attributes) {
    return false;
  }
  return (
    Boolean(attributes) &&
    typeof attributes === 'object' &&
    'type' in attributes &&
    attributes.type === 'lens'
  );
}

function isLensAttributesState(state: unknown): state is LensAttributes['state'] {
  return typeof state === 'object' && state !== null && 'datasourceStates' in state;
}

function scoreMatch(matchedBy: SuggestedMatchedBy, fields: string[], index: string[]): number {
  // Filter out excluded fields
  const allFields = fields.filter((field) => !SCORING_EXCLUDED_FIELDS.has(field));
  const matchedByFields =
    matchedBy?.fields?.filter((field) => !SCORING_EXCLUDED_FIELDS.has(field)) || [];

  // Calculate Jaccard similarity
  const matchingFields = new Set<string>();
  matchedByFields.forEach((field) => matchingFields.add(field));

  // Get indexes from matchedBy
  if (matchedBy.index) {
    matchedBy.index.forEach((idx) => matchingFields.add(idx));
  }

  // Add provided indexes
  if (index && index.length > 0) {
    index.forEach((idx) => matchingFields.add(idx));
  }

  // Calculate Jaccard similarity for fields/indices
  const setA = new Set<string>([...allFields, ...(index || [])]);
  const setB = matchingFields;
  const intersection = new Set([...setA].filter((item) => setB.has(item)));
  const union = new Set([...setA, ...setB]);

  let baseScore = intersection.size / Math.max(union.size, 1); // Avoid division by zero

  // Apply textMatch boost if available (heavily weight this)
  if (matchedBy.textMatch && matchedBy.textMatch > 0) {
    baseScore = baseScore + matchedBy.textMatch * 0.5;
  }

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
  matchedBy: Omit<SuggestedMatchedBy, 'isManaged'>
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
