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
import {
  SuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidRuleTypeId,
} from './helpers';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { MatchedBy } from '@kbn/observability-schema/related_dashboards/schema/related_dashboard/v1';

const MAX_SUGGESTED_MANAGED_DASHBOARDS = 3;
const SCORING_EXCLUDED_FIELDS = ['tags', 'event.action', 'event.kind'];
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

  private getPanelIndicesMap: Record<
    SuggestedDashboardsValidPanelType,
    (panel: DashboardPanel) => Set<string> | undefined
  > = {
    lens: (panel: DashboardPanel) => {
      let references = isLensVizAttributes(panel.panelConfig.attributes)
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
    },
  };

  private getPanelFieldsMap: Record<
    SuggestedDashboardsValidPanelType,
    (panel: DashboardPanel) => Set<string> | undefined
  > = {
    lens: (panel: DashboardPanel) => {
      let state: unknown = isLensVizAttributes(panel.panelConfig.attributes)
        ? panel.panelConfig.attributes.state
        : undefined;
      if (!state && panel.panelIndex) {
        state = this.referencedPanelManager.getByIndex(panel.panelIndex)?.state;
      }
      if (isLensAttributesState(state)) {
        const fields = new Set<string>();
        const dataSourceLayers = state.datasourceStates.formBased?.layers || {};
        Object.values(dataSourceLayers).forEach((ds) => {
          const columns = ds.columns;
          Object.values(columns).forEach((col) => {
            if ('sourceField' in col) {
              fields.add(col.sourceField);
            }
          });
        });
        return fields;
      }
    },
  };

  private rankDashboards(alert: AlertData): SuggestedDashboard[] {
    // TODO: Do we need this
    if (!isSuggestedDashboardsValidRuleTypeId(alert.getRuleTypeId())) return [];

    const suggestedDashboards = new Set<SuggestedDashboard>();

    // Add dashboards that are text matches
    this.dashboardsById.forEach((dashboard, id) => {
      if (dashboard.score && dashboard.score > 0) {
        suggestedDashboards.add({
          id: dashboard.id,
          title: dashboard.attributes.title,
          description: dashboard.attributes.description,
          tags: dashboard.attributes.tags,
          matchedBy: { textMatch: dashboard.score, isManaged: dashboard.managed },
          score: dashboard.score ?? 0,
        });
      }
    });

    // Add dashboards that are field matches
    this.dashboardsForField(alert.getAllRelevantFields(), this.dashboardsById.values()).forEach(
      (dashboard) => suggestedDashboards.add(dashboard)
    );

    // Add dashboards that are index matches
    const ruleQueryIndex = alert.getRuleQueryIndex();
    if (ruleQueryIndex) {
      const { dashboards } = this.dashboardsForIndex(ruleQueryIndex, this.dashboardsById.values());
      dashboards.forEach((dashboard) => suggestedDashboards.add(dashboard));
    }

    const relevantDashboardsById = new Map<string, SuggestedDashboard>();
    const index = alert.getRuleQueryIndex();

    Object.values(this.dashboardsById)
      .filter((d) => d.matchedBy.fields.size > 0 || d.matchedBy.index.size > 0 || d.textMatch > 0)
      .forEach((d) => {
        suggestedDashboards.add({
          id: d.id,
          title: d.attributes.title,
          description: d.attributes.description,
          tags: d.attributes.tags,
          // If it has a pre-existing score, that's a text match
          matchedBy: { textMatch: d.score, isManaged: d.managed },
          score: d.score ?? 0,
        });
      });

    suggestedDashboards.forEach((dashboard) => {
      relevantDashboardsById.set(dashboard.id, {
        ...dashboard,
        matchedBy: {
          ...relevantDashboardsById.get(dashboard.id)?.matchedBy,
          ...dashboard.matchedBy,
        },
        score: scoreMatch(dashboard.matchedBy, allRelevantFields, index ? [index] : []),
      });
    });

    let matchedManagedDashboards = 0;
    const sortedDashboards = Array.from(relevantDashboardsById.values())
      .sort((a, b) => {
        return b.score - a.score;
      })
      .filter((d) => {
        // Unmanaged dashboards (user created) always match
        if (!d.matchedBy.isManaged) {
          return true;
        }
        // Only allow as many managed dashboards as the quota allows
        matchedManagedDashboards++;
        if (matchedManagedDashboards > MAX_SUGGESTED_MANAGED_DASHBOARDS) {
          return false;
        }
        return true;
      });

    return sortedDashboards;
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
    for (const [index, dashboard] of textMatches.result.hits.entries()) {
      // Declining initial score based on distance from the top of the results
      dashboard.score = TEXT_MATCH_LIMIT - index;
    }
    await this.processDashboardSearch(textMatches);

    // Now match by fields and indices, these will use the previous score as a multiplier if relevant
    const allMatches = await this.dashboardClient.search({ limit: UNFILTERED_MATCH_LIMIT });
    await this.processDashboardSearch(allMatches);

    return this.rankDashboards(alert);
  }

  private async processDashboardSearch(dsr: SearchResponse<Dashboard>, rankScore = false) {
    const {
      result: { hits },
    } = dsr;
    for (const [idx, dashboard] of hits.entries()) {
      for (const panel of dashboard.attributes.panels) {
        if (
          isDashboardPanel(panel) &&
          isSuggestedDashboardsValidPanelType(panel.type) &&
          (isEmpty(panel.panelConfig) || !panel.panelConfig.attributes)
        ) {
          this.referencedPanelManager.addReferencedPanel({ dashboard, panel });
        }
      }

      // For text matches we start the score based on their position in the results
      if (rankScore) {
        dashboard.score = hits.length - idx;
      }
      this.dashboardsById.set(dashboard.id, dashboard);
    }

    await this.referencedPanelManager.fetchReferencedPanels();
  }

  private dashboardsForIndex(
    index: string,
    dashboards: Iterable<Dashboard>
  ): {
    dashboards: SuggestedDashboard[];
  } {
    const relevantDashboards: SuggestedDashboard[] = [];
    for (const d of dashboards) {
      const panels = d.attributes.panels.filter(isDashboardPanel);
      const matchingPanels = this.panelsWithIndex(index, panels);
      if (matchingPanels.length > 0) {
        this.logger.debug(
          () => `Found ${matchingPanels.length} panel(s) in dashboard ${d.id} using index ${index}`
        );
        relevantDashboards.push({
          id: d.id,
          title: d.attributes.title,
          description: d.attributes.description,
          tags: d.attributes.tags,
          matchedBy: { index: [index] },
          score: 0, // scores are computed when dashboards are deduplicated
        });
      }
    }
    return { dashboards: relevantDashboards };
  }

  private dashboardsForField(
    fields: string[],
    dashboards: Iterable<Dashboard>
  ): SuggestedDashboard[] {
    const relevantDashboards: SuggestedDashboard[] = [];
    for (const d of dashboards) {
      const panels = d.attributes.panels.filter(isDashboardPanel);
      const matchingPanels = this.getPanelsByField(fields, panels);
      const allMatchingFields = new Set(
        matchingPanels.map((p) => Array.from(p.matchingFields)).flat()
      );
      if (matchingPanels.length > 0) {
        this.logger.debug(
          () =>
            `Found ${matchingPanels.length} panel(s) in dashboard ${
              d.id
            } using field(s) ${Array.from(allMatchingFields).toString()}`
        );
        relevantDashboards.push({
          id: d.id,
          title: d.attributes.title,
          description: d.attributes.description,
          tags: d.attributes.tags,
          matchedBy: { fields: Array.from(allMatchingFields) },
          score: 0, // scores are computed when dashboards are deduplicated
        });
      }
    }
    return relevantDashboards;
  }

  private panelsWithIndex(index: string, panels: DashboardPanel[]): DashboardPanel[] {
    const panelsByIndex = panels.filter((p) => this.getPanelIndices(p).has(index));
    return panelsByIndex;
  }

  private getPanelsByField(
    fields: string[],
    panels: DashboardPanel[]
  ): Array<{ matchingFields: Set<string>; panel: DashboardPanel }> {
    const panelsByField = panels.reduce((acc, p) => {
      const matchingFields = fields.filter((f) => this.getPanelFields(p).has(f));
      if (matchingFields.length) {
        acc.push({ matchingFields: new Set(matchingFields), panel: p });
      }
      return acc;
    }, [] as Array<{ matchingFields: Set<string>; panel: DashboardPanel }>);
    return panelsByField;
  }

  private getPanelIndices(panel: DashboardPanel): Set<string> {
    const indices = isSuggestedDashboardsValidPanelType(panel.type)
      ? this.getPanelIndicesMap[panel.type](panel)
      : undefined;
    return indices ?? new Set<string>();
  }

  private getPanelFields(panel: DashboardPanel): Set<string> {
    const fields = isSuggestedDashboardsValidPanelType(panel.type)
      ? this.getPanelFieldsMap[panel.type](panel)
      : undefined;
    return fields ?? new Set<string>();
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

function isLensVizAttributes(attributes: unknown): attributes is LensAttributes {
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

function scoreMatch(
  matchedBy: MatchedBy & { textMatch?: number; isManaged?: boolean },
  fields: string[],
  index: string[]
): number {
  // Filter out excluded fields
  const filteredFields = fields.filter((field) => !SCORING_EXCLUDED_FIELDS.includes(field));

  // Calculate Jaccard similarity
  const matchingFields = new Set<string>();

  // Get fields from matchedBy
  if (matchedBy.fields) {
    matchedBy.fields
      .filter((field) => !SCORING_EXCLUDED_FIELDS.includes(field))
      .forEach((field) => matchingFields.add(field));
  }

  // Get indexes from matchedBy
  if (matchedBy.index) {
    matchedBy.index.forEach((idx) => matchingFields.add(idx));
  }

  // Add provided indexes
  if (index && index.length > 0) {
    index.forEach((idx) => matchingFields.add(idx));
  }

  // Calculate Jaccard similarity for fields/indices
  const setA = new Set<string>([...filteredFields, ...(index || [])]);
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
