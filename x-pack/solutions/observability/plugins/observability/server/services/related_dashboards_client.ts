/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { isEmpty, omit } from 'lodash';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardPanel } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type {
  RelevantPanel,
  RelatedDashboard,
  SuggestedDashboard,
  LinkedDashboard,
} from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import {
  ReferencedPanelAttributes,
  SuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidPanelType,
  isSuggestedDashboardsValidRuleTypeId,
} from './helpers';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;
export class RelatedDashboardsClient {
  public dashboardsById = new Map<string, Dashboard>();
  private alert: AlertData | null = null;

  constructor(
    private logger: Logger,
    private dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string,
    private soClient: SavedObjectsClientContract
  ) {}

  private getPanelIndicesMap: Record<
    SuggestedDashboardsValidPanelType,
    (panelAttributes: unknown) => Set<string> | undefined
  > = {
    lens: (panelAttributes: unknown) => {
      if (this.isLensVizAttributes(panelAttributes)) {
        return new Set(
          panelAttributes.references
            .filter((r) => r.name.match(`indexpattern`))
            .map((reference) => reference.id)
        );
      }
    },
  };

  private getPanelFieldsMap: Record<
    SuggestedDashboardsValidPanelType,
    (panelAttributes: unknown) => Set<string> | undefined
  > = {
    lens: (panelAttributes: unknown) => {
      if (this.isLensVizAttributes(panelAttributes)) {
        const fields = new Set<string>();
        const dataSourceLayers = panelAttributes.state.datasourceStates.formBased?.layers || {};
        Object.values(dataSourceLayers).forEach((ds) => {
          const columns = ds.columns;
          Object.values(columns).forEach((col) => {
            const hasSourceField = (
              c: FieldBasedIndexPatternColumn | GenericIndexPatternColumn
            ): c is FieldBasedIndexPatternColumn =>
              (c as FieldBasedIndexPatternColumn).sourceField !== undefined;
            if (hasSourceField(col)) {
              fields.add(col.sourceField);
            }
          });
        });
        return fields;
      }
    },
  };

  public async fetchRelatedDashboards(): Promise<{
    suggestedDashboards: SuggestedDashboard[];
    linkedDashboards: LinkedDashboard[];
  }> {
    const [alertDocument] = await Promise.all([
      this.alertsClient.getAlertById(this.alertId),
      this.fetchFirst500Dashboards(),
    ]);
    this.setAlert(alertDocument);
    const [suggestedDashboards, linkedDashboards] = await Promise.all([
      this.fetchSuggestedDashboards(),
      this.getLinkedDashboards(),
    ]);
    const filteredSuggestedDashboards = suggestedDashboards.filter(
      (suggested) => !linkedDashboards.some((linked) => linked.id === suggested.id)
    );
    return {
      suggestedDashboards: filteredSuggestedDashboards.slice(0, 10), // limit to 10 suggested dashboards
      linkedDashboards,
    };
  }

  private setAlert(alert: AlertData) {
    this.alert = alert;
  }

  private checkAlert(): AlertData {
    if (!this.alert)
      throw new Error(
        `Alert with id ${this.alertId} not found. Could not fetch related dashboards.`
      );
    return this.alert;
  }

  private async fetchSuggestedDashboards(): Promise<SuggestedDashboard[]> {
    const alert = this.checkAlert();
    if (!isSuggestedDashboardsValidRuleTypeId(alert.getRuleTypeId())) return [];

    const allSuggestedDashboards = new Set<SuggestedDashboard>();
    const relevantDashboardsById = new Map<string, SuggestedDashboard>();
    const index = this.getRuleQueryIndex();
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
      const dedupedPanels = this.dedupePanels([
        ...(relevantDashboardsById.get(dashboard.id)?.relevantPanels || []),
        ...dashboard.relevantPanels,
      ]);
      const relevantPanelCount = dedupedPanels.length;
      relevantDashboardsById.set(dashboard.id, {
        ...dashboard,
        matchedBy: {
          ...relevantDashboardsById.get(dashboard.id)?.matchedBy,
          ...dashboard.matchedBy,
        },
        relevantPanelCount,
        relevantPanels: dedupedPanels,
        score: this.getScore(dashboard),
      });
    });
    const sortedDashboards = Array.from(relevantDashboardsById.values()).sort((a, b) => {
      return b.score - a.score;
    });
    return sortedDashboards;
  }

  private async fetchReferencedPanel({
    dashboard,
    panel,
  }: {
    dashboard: Dashboard;
    panel: DashboardPanel;
  }): Promise<DashboardPanel> {
    const panelReference = dashboard.references.find(
      (r) => panel.panelIndex && r.name.includes(panel.panelIndex) && r.type === panel.type
    );

    // A reference of the panel was not found
    if (!panelReference) {
      this.logger.error(
        `Reference for panel of type ${panel.type} and panelIndex ${panel.panelIndex} was not found in dashboard with id ${dashboard.id}`
      );
      return panel;
    }

    try {
      const so = await this.soClient.get<ReferencedPanelAttributes>(panel.type, panelReference.id);
      return {
        ...panel,
        panelConfig: {
          ...panel.panelConfig,
          attributes: so.attributes,
        },
      };
    } catch (error) {
      // There was an error fetching the referenced saved object
      this.logger.error(
        `Error fetching panel with type ${panel.type} and id ${panelReference.id}: ${error.message}`
      );
      return panel;
    }
  }

  private async fetchDashboards({
    page,
    perPage = 20,
    limit,
  }: {
    page: number;
    perPage?: number;
    limit?: number;
  }) {
    const dashboards = await this.dashboardClient.search({ limit: perPage, cursor: `${page}` });
    const {
      result: { hits },
    } = dashboards;
    for (const dashboard of hits) {
      const panels: DashboardAttributes['panels'] = await Promise.all(
        dashboard.attributes.panels.map(async (panel) =>
          isDashboardPanel(panel) &&
          isEmpty(panel.panelConfig) &&
          isSuggestedDashboardsValidPanelType(panel.type)
            ? await this.fetchReferencedPanel({
                dashboard,
                panel,
              })
            : panel
        )
      );
      this.dashboardsById.set(dashboard.id, {
        ...dashboard,
        attributes: { ...dashboard.attributes, panels },
      });
    }

    const fetchedUntil = (page - 1) * perPage + dashboards.result.hits.length;

    if (dashboards.result.pagination.total <= fetchedUntil) {
      return;
    }
    if (limit && fetchedUntil >= limit) {
      return;
    }
    await this.fetchDashboards({ page: page + 1, perPage, limit });
  }

  private async fetchFirst500Dashboards() {
    await this.fetchDashboards({ page: 1, perPage: 500, limit: 500 });
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
          relevantPanelCount: matchingPanels.length,
          relevantPanels: matchingPanels.map((p) => ({
            panel: {
              panelIndex: p.panelIndex || uuidv4(),
              type: p.type,
              panelConfig: p.panelConfig,
              title: (p.panelConfig as { title?: string }).title,
            },
            matchedBy: { index: [index] },
          })),
          score: 0, // scores are computed when dashboards are deduplicated
        });
      }
    });
    return { dashboards: relevantDashboards };
  }

  private dedupePanels(panels: RelevantPanel[]): RelevantPanel[] {
    const uniquePanels = new Map<string, RelevantPanel>();
    panels.forEach((p) => {
      uniquePanels.set(p.panel.panelIndex, {
        ...p,
        matchedBy: { ...uniquePanels.get(p.panel.panelIndex)?.matchedBy, ...p.matchedBy },
      });
    });
    return Array.from(uniquePanels.values());
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
          relevantPanelCount: matchingPanels.length,
          relevantPanels: matchingPanels.map((p) => ({
            panel: {
              panelIndex: p.panel.panelIndex || uuidv4(),
              type: p.panel.type,
              panelConfig: p.panel.panelConfig,
              title: (p.panel.panelConfig as { title?: string }).title,
            },
            matchedBy: { fields: Array.from(p.matchingFields) },
          })),
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
      ? this.getPanelIndicesMap[panel.type](panel.panelConfig.attributes)
      : undefined;
    return indices ?? new Set<string>();
  }

  private getPanelFields(panel: DashboardPanel): Set<string> {
    const fields = isSuggestedDashboardsValidPanelType(panel.type)
      ? this.getPanelFieldsMap[panel.type](panel.panelConfig.attributes)
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

  private getRuleQueryIndex(): string | null {
    const alert = this.checkAlert();
    const index = alert.getRuleQueryIndex();
    return index;
  }

  private async getLinkedDashboards(): Promise<LinkedDashboard[]> {
    const alert = this.checkAlert();
    const ruleId = alert.getRuleId();
    if (!ruleId) {
      throw new Error(
        `Alert with id ${this.alertId} does not have a rule ID. Could not fetch linked dashboards.`
      );
    }
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

  private getScore(dashboard: RelatedDashboard): number {
    const alert = this.checkAlert();
    const allRelevantFields = alert.getAllRelevantFields();
    const index = this.getRuleQueryIndex();
    const setA = new Set<string>([...allRelevantFields, ...(index ? [index] : [])]);
    const setB = new Set<string>(this.getMatchingFields(dashboard));
    const intersection = new Set([...setA].filter((item) => setB.has(item)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }
}
