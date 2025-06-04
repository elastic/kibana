/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardSection } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { RelatedDashboard, RelevantPanel } from '@kbn/observability-schema';
import { v4 as uuidv4 } from 'uuid';
import type { AlertData } from './alert_data';
import type { InvestigateAlertsClient } from './investigate_alerts_client';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;
export class RelatedDashboardsClient {
  public dashboardsById = new Map<string, Dashboard>();
  private alert: AlertData | null = null;

  constructor(
    private logger: Logger,
    private dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string
  ) {}

  setAlert(alert: AlertData) {
    this.alert = alert;
  }

  async fetchSuggestedDashboards(): Promise<{ suggestedDashboards: RelatedDashboard[] }> {
    const allRelatedDashboards = new Set<RelatedDashboard>();
    const relevantDashboardsById = new Map<string, RelatedDashboard>();
    const [alert] = await Promise.all([
      this.alertsClient.getAlertById(this.alertId),
      this.fetchFirst500Dashboards(),
    ]);
    this.setAlert(alert);
    if (!this.alert) {
      throw new Error(
        `Alert with id ${this.alertId} not found. Could not fetch related dashboards.`
      );
    }
    const index = await this.getRuleQueryIndex();
    const allRelevantFields = this.alert.getAllRelevantFields();

    if (index) {
      const { dashboards } = this.getDashboardsByIndex(index);
      dashboards.forEach((dashboard) => allRelatedDashboards.add(dashboard));
    }
    if (allRelevantFields.length > 0) {
      const { dashboards } = this.getDashboardsByField(allRelevantFields);
      dashboards.forEach((dashboard) => allRelatedDashboards.add(dashboard));
    }
    allRelatedDashboards.forEach((dashboard) => {
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
    return { suggestedDashboards: sortedDashboards.slice(0, 10) };
  }

  async fetchDashboards({
    page,
    perPage = 20,
    limit,
  }: {
    page: number;
    perPage?: number;
    limit?: number;
  }) {
    const dashboards = await this.dashboardClient.search(
      { limit: perPage, cursor: `${page}` },
      { spaces: ['*'] }
    );
    const {
      result: { hits },
    } = dashboards;
    hits.forEach((dashboard: Dashboard) => {
      this.dashboardsById.set(dashboard.id, dashboard);
    });
    const fetchedUntil = (page - 1) * perPage + dashboards.result.hits.length;

    if (dashboards.result.pagination.total <= fetchedUntil) {
      return;
    }
    if (limit && fetchedUntil >= limit) {
      return;
    }
    await this.fetchDashboards({ page: page + 1, perPage, limit });
  }

  async fetchFirst500Dashboards() {
    await this.fetchDashboards({ page: 1, perPage: 500, limit: 500 });
  }

  getDashboardsByIndex(index: string): {
    dashboards: RelatedDashboard[];
  } {
    const relevantDashboards: RelatedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
      const panels = d.attributes.panels;
      const matchingPanels = this.getPanelsByIndex(index, panels);
      if (matchingPanels.length > 0) {
        this.logger.debug(
          () => `Found ${matchingPanels.length} panel(s) in dashboard ${d.id} using index ${index}`
        );
        relevantDashboards.push({
          id: d.id,
          title: d.attributes.title,
          matchedBy: { index: [index] },
          relevantPanelCount: matchingPanels.length,
          relevantPanels: matchingPanels.map((p) => ({
            panel: {
              panelIndex: p.panelIndex || uuidv4(),
              type: p.type,
              panelConfig: p.panelConfig,
              title: p.title,
            },
            matchedBy: { index: [index] },
          })),
          score: 0, // scores are computed when dashboards are deduplicated
        });
      }
    });
    return { dashboards: relevantDashboards };
  }

  dedupePanels(panels: RelevantPanel[]): RelevantPanel[] {
    const uniquePanels = new Map<string, RelevantPanel>();
    panels.forEach((p) => {
      uniquePanels.set(p.panel.panelIndex, {
        ...p,
        matchedBy: { ...uniquePanels.get(p.panel.panelIndex)?.matchedBy, ...p.matchedBy },
      });
    });
    return Array.from(uniquePanels.values());
  }

  getDashboardsByField(fields: string[]): {
    dashboards: RelatedDashboard[];
  } {
    const relevantDashboards: RelatedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
      const panels = d.attributes.panels;
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
          matchedBy: { fields: Array.from(allMatchingFields) },
          relevantPanelCount: matchingPanels.length,
          relevantPanels: matchingPanels.map((p) => ({
            panel: {
              panelIndex: p.panel.panelIndex || uuidv4(),
              type: p.panel.type,
              panelConfig: p.panel.panelConfig,
              title: p.panel.title,
            },
            matchedBy: { fields: Array.from(p.matchingFields) },
          })),
          score: 0, // scores are computed when dashboards are deduplicated
        });
      }
    });
    return { dashboards: relevantDashboards };
  }

  getPanelsByIndex(index: string, panels: DashboardAttributes['panels']): DashboardPanel[] {
    const panelsByIndex = panels.filter((p) => {
      if (isDashboardSection(p)) return false; // filter out sections
      const panelIndices = this.getPanelIndices(p);
      return panelIndices.has(index);
    }) as DashboardPanel[]; // filtering with type guard doesn't actually limit type, so need to cast
    return panelsByIndex;
  }

  getPanelsByField(
    fields: string[],
    panels: DashboardAttributes['panels']
  ): Array<{ matchingFields: Set<string>; panel: DashboardPanel }> {
    const panelsByField = panels.reduce((acc, p) => {
      if (isDashboardSection(p)) return acc; // filter out sections
      const panelFields = this.getPanelFields(p);
      const matchingFields = fields.filter((f) => panelFields.has(f));
      if (matchingFields.length) {
        acc.push({ matchingFields: new Set(matchingFields), panel: p });
      }
      return acc;
    }, [] as Array<{ matchingFields: Set<string>; panel: DashboardPanel }>);
    return panelsByField;
  }

  getPanelIndices(panel: DashboardPanel): Set<string> {
    const indices = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const lensAttr = panel.panelConfig.attributes as unknown as LensAttributes;
        if (!lensAttr) {
          return indices;
        }
        const lensIndices = this.getLensVizIndices(lensAttr);
        return lensIndices;
      default:
        return indices;
    }
  }

  getPanelFields(panel: DashboardPanel): Set<string> {
    const fields = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const lensAttr = panel.panelConfig.attributes as unknown as LensAttributes;
        const lensFields = this.getLensVizFields(lensAttr);
        return lensFields;
      default:
        return fields;
    }
  }

  getRuleQueryIndex(): string | null {
    if (!this.alert) {
      throw new Error('Alert not found. Could not get the rule query index.');
    }
    const index = this.alert.getRuleQueryIndex();
    return index;
  }

  getLensVizIndices(lensAttr: LensAttributes): Set<string> {
    const indices = new Set(
      lensAttr.references
        .filter((r) => r.name.match(`indexpattern`))
        .map((reference) => reference.id)
    );
    return indices;
  }

  getLensVizFields(lensAttr: LensAttributes): Set<string> {
    const fields = new Set<string>();
    const dataSourceLayers = lensAttr.state.datasourceStates.formBased?.layers || {};
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

  getMatchingFields(dashboard: RelatedDashboard): string[] {
    const matchingFields = new Set<string>();
    // grab all the top level arrays from the matchedBy object via Object.values
    Object.values(dashboard.matchedBy).forEach((match) => {
      // add the values of each array to the matchingFields set
      match.forEach((value) => {
        matchingFields.add(value);
      });
    });
    return Array.from(matchingFields);
  }

  getScore(dashboard: RelatedDashboard): number {
    if (!this.alert) {
      throw new Error(
        `Alert with id ${this.alertId} not found. Could not compute the relevance score for suggested dashboard.`
      );
    }
    const allRelevantFields = this.alert.getAllRelevantFields();
    const index = this.getRuleQueryIndex();
    const setA = new Set<string>([...allRelevantFields, ...(index ? [index] : [])]);
    const setB = new Set<string>(this.getMatchingFields(dashboard));
    const intersection = new Set([...setA].filter((item) => setB.has(item)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }
}
