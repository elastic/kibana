/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty, omit } from 'lodash';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import { SearchResponse } from '@kbn/content-management-plugin/server/core/crud';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardPanel } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type {
  RelatedDashboard,
  SuggestedDashboard,
  LinkedDashboard,
} from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import {
  SuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidRuleTypeId,
} from './helpers';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { SearchQuery } from '@kbn/content-management-plugin/common';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;

export class RelatedDashboardsClient {
  public dashboardsById = new Map<string, Dashboard>();
  private alert: AlertData | null = null;

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
      this.fetchSuggested(alert, {
        ruleName: alert.getRuleName() || '',
        page: 1,
        limit: 100,
      }),
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
      let references = this.isLensVizAttributes(panel.panelConfig.attributes)
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
      let state: unknown = this.isLensVizAttributes(panel.panelConfig.attributes)
        ? panel.panelConfig.attributes.state
        : undefined;
      if (!state && panel.panelIndex) {
        state = this.referencedPanelManager.getByIndex(panel.panelIndex)?.state;
      }
      if (this.isLensAttributesState(state)) {
        const fields = new Set<string>();
        const dataSourceLayers = state.datasourceStates.formBased?.layers || {};
        Object.values(dataSourceLayers).forEach((ds) => {
          const columns = ds.columns;
          Object.values(columns).forEach((col) => {
            if (this.hasSourceField(col)) {
              fields.add(col.sourceField);
            }
          });
        });
        return fields;
      }
    },
  };

  private hasSourceField(c: GenericIndexPatternColumn): c is FieldBasedIndexPatternColumn {
    return 'sourceField' in c;
  }

  private isLensAttributesState(state: unknown): state is LensAttributes['state'] {
    return typeof state === 'object' && state !== null && 'datasourceStates' in state;
  }

  private rankDashboards(alert: AlertData): SuggestedDashboard[] {
    if (!isSuggestedDashboardsValidRuleTypeId(alert.getRuleTypeId())) return [];

    const allSuggestedDashboards = new Set<SuggestedDashboard>();
    const relevantDashboardsById = new Map<string, SuggestedDashboard>();
    const index = alert.getRuleQueryIndex();
    const allRelevantFields = alert.getAllRelevantFields();

    if (index) {
      const { dashboards } = this.getDashboardsByIndex(index);
      dashboards.forEach((dashboard) => allSuggestedDashboards.add(dashboard));
    }
    if (allRelevantFields.length > 0) {
      const { dashboards } = this.getDashboardsByField(allRelevantFields);
      dashboards.forEach((dashboard) => allSuggestedDashboards.add(dashboard));
    }

    allSuggestedDashboards.forEach((dashboard) => {
      relevantDashboardsById.set(dashboard.id, {
        ...dashboard,
        matchedBy: {
          ...relevantDashboardsById.get(dashboard.id)?.matchedBy,
          ...dashboard.matchedBy,
        },
        score: this.getScore(alert, dashboard),
      });
    });

    const sortedDashboards = Array.from(relevantDashboardsById.values()).sort((a, b) => {
      return b.score - a.score;
    });
    return sortedDashboards;
  }

  private async fetchSuggested(
    alert: AlertData,
    {
      ruleName,
      page,
      perPage = 20,
      limit,
    }: {
      ruleName: string;
      page: number;
      perPage?: number;
      limit?: number;
    }
  ): Promise<SuggestedDashboard[]> {
    const searchAndStore = async (query: SearchQuery) => {
      const res = await await this.dashboardClient.search(query);
      await this.processDashboardSearch(res);
    };
    await Promise.all([
      searchAndStore({ text: ruleName, defaultSearchOperator: 'OR', limit: 100 }),
      searchAndStore({ limit: 500 }),
    ]);

    return this.rankDashboards(alert);
  }

  private async processDashboardSearch(dsr: SearchResponse<Dashboard>) {
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
      this.dashboardsById.set(dashboard.id, dashboard);
    }

    await this.referencedPanelManager.fetchReferencedPanels();
  }

  private getDashboardsByIndex(index: string): {
    dashboards: SuggestedDashboard[];
  } {
    const relevantDashboards: SuggestedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
      const panels = d.attributes.panels.filter(isDashboardPanel);
      const matchingPanels = this.getPanelsByIndex(index, panels);
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
    });
    return { dashboards: relevantDashboards };
  }

  private getDashboardsByField(fields: string[]): {
    dashboards: SuggestedDashboard[];
  } {
    const relevantDashboards: SuggestedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
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
    });
    return { dashboards: relevantDashboards };
  }

  private getPanelsByIndex(index: string, panels: DashboardPanel[]): DashboardPanel[] {
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

  private isLensVizAttributes(attributes: unknown): attributes is LensAttributes {
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

  private getMatchingFields(dashboard: RelatedDashboard): string[] {
    const matchingFields = new Set<string>();
    // grab all the top level arrays from the matchedBy object via Object.values
    Object.values(omit(dashboard.matchedBy, 'linked')).forEach((match) => {
      // add the values of each array to the matchingFields set
      match.forEach((value) => {
        matchingFields.add(value);
      });
    });
    return Array.from(matchingFields);
  }

  private getScore(alert: AlertData, dashboard: RelatedDashboard): number {
    const allRelevantFields = alert.getAllRelevantFields();
    const index = alert.getRuleQueryIndex();
    const setA = new Set<string>([...allRelevantFields, ...(index ? [index] : [])]);
    const setB = new Set<string>(this.getMatchingFields(dashboard));
    const intersection = new Set([...setA].filter((item) => setB.has(item)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }
}
