/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { Logger } from '@kbn/core/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { RelevantPanel, RecommendedDashboard } from '@kbn/observability-schema';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/server';
import type { InvestigateAlertsClient, AlertData } from './investigate_alerts_client';
import type { DashboardsClient } from './create_dashboards_client';

type Dashboard = SavedObjectsFindResult<DashboardSavedObjectAttributes>;
type ParsedDashboard = SavedObjectsFindResult<DashboardSavedObjectAttributes> & {
  attributes: { panels: SavedDashboardPanel[] };
};

export class SuggestedDashboardsClient {
  private logger: Logger;
  private dashboardsById = new Map<string, ParsedDashboard>();
  private dashboardClient: DashboardsClient;
  private alertsClient: InvestigateAlertsClient;
  private alertId: string;

  constructor({
    logger,
    dashboardClient,
    alertsClient,
    alertId,
  }: {
    logger: Logger;
    dashboardClient: DashboardsClient;
    alertsClient: InvestigateAlertsClient;
    alertId: string;
  }) {
    this.logger = logger;
    this.dashboardClient = dashboardClient;
    this.alertsClient = alertsClient;
    this.alertId = alertId;
  }

  async fetchSuggestedDashboards(): Promise<{ dashboards: RecommendedDashboard[] }> {
    const allRelatedDashboards = new Set<RecommendedDashboard>();
    const relevantDashboardsById = new Map<string, RecommendedDashboard>();
    const [alert] = await Promise.all([
      this.alertsClient.getAlertById(this.alertId),
      this.fetchDashboards(),
    ]);
    const index = await this.getRuleQueryIndex(alert);
    const relevantRuleFields = this.alertsClient.getRelevantRuleFields(alert);
    const relevantAlertFields = this.alertsClient.getRelevantAADFields(alert);
    const allRelevantFields = new Set([...relevantRuleFields, ...relevantAlertFields]);

    if (index) {
      const { dashboards } = this.getDashboardsByIndex(index);
      dashboards.forEach((dashboard) => allRelatedDashboards.add(dashboard));
    }
    if (allRelevantFields.size > 0) {
      const { dashboards } = this.getDashboardsByField(Array.from(allRelevantFields));
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
      });
    });
    return { dashboards: Array.from(relevantDashboardsById.values()) };
  }

  async fetchDashboards() {
    const dashboards = await this.dashboardClient.getAllDashboards();
    dashboards.forEach((dashboard: SavedObjectsFindResult<DashboardSavedObjectAttributes>) => {
      this.dashboardsById.set(dashboard.id, this.parseDashboardPanels(dashboard));
    });
  }

  getDashboardsByIndex(index: string): {
    dashboards: RecommendedDashboard[];
  } {
    const relevantDashboards: RecommendedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
      const panels = d.attributes.panels;
      const matchingPanels = this.getPanelsByIndex(index, panels);
      if (matchingPanels.length > 0) {
        this.logger.info(
          () => `Found ${matchingPanels.length} panel(s) in dashboard ${d.id} using index ${index}`
        );
        relevantDashboards.push({
          id: d.id,
          title: d.attributes.title,
          matchedBy: { index: [index] },
          relevantPanelCount: matchingPanels.length,
          relevantPanels: matchingPanels.map((p) => ({
            panel: p,
            matchedBy: { index: [index] },
          })),
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
    dashboards: RecommendedDashboard[];
  } {
    const relevantDashboards: RecommendedDashboard[] = [];
    this.dashboardsById.forEach((d) => {
      const panels = d.attributes.panels;
      const matchingPanels = this.getPanelsByField(fields, panels);
      const allMatchingFields = new Set(
        matchingPanels.map((p) => Array.from(p.matchingFields)).flat()
      );
      if (matchingPanels.length > 0) {
        this.logger.info(
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
            panel: p.panel,
            matchedBy: { fields: Array.from(p.matchingFields) },
          })),
        });
      }
    });
    return { dashboards: relevantDashboards };
  }

  getPanelsByIndex(index: string, panels: SavedDashboardPanel[]): SavedDashboardPanel[] {
    const panelsByIndex = panels.filter((p) => {
      const panelIndices = this.getPanelIndices(p);
      return panelIndices.has(index);
    });
    return panelsByIndex;
  }

  getPanelsByField(
    fields: string[],
    panels: SavedDashboardPanel[]
  ): Array<{ matchingFields: Set<string>; panel: SavedDashboardPanel }> {
    const panelsByField = panels.reduce((acc, p) => {
      const panelFields = this.getPanelFields(p);
      const matchingFields = fields.filter((f) => panelFields.has(f));
      if (matchingFields.length) {
        acc.push({ matchingFields: new Set(matchingFields), panel: p });
      }
      return acc;
    }, [] as Array<{ matchingFields: Set<string>; panel: SavedDashboardPanel }>);
    return panelsByField;
  }

  getPanelIndices(panel: SavedDashboardPanel): Set<string> {
    const indices = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const lensAttr = panel.embeddableConfig.attributes as unknown as LensAttributes;
        if (!lensAttr) {
          return indices;
        }
        const lensIndices = this.getLensVizIndices(lensAttr);
        return lensIndices;
      default:
        return indices;
    }
  }

  getPanelFields(panel: SavedDashboardPanel): Set<string> {
    const fields = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const lensAttr = panel.embeddableConfig.attributes as unknown as LensAttributes;
        const lensFields = this.getLensVizFields(lensAttr);
        return lensFields;
      default:
        return fields;
    }
  }

  async getRuleQueryIndex(alert: AlertData): Promise<string> {
    const index = this.alertsClient.getRuleQueryIndex(alert);
    return typeof index === 'string' ? index : index.id || '';
  }

  getLensVizIndices(lensAttr: LensAttributes): Set<string> {
    const indices = new Set(
      lensAttr.references
        .filter((r) => r.name.match(`indexpattern`))
        .map((reference) => reference.id)
    );
    if (indices.size === 0) {
      throw new Error('No index patterns found in lens visualization');
    }
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

  parseDashboardPanels(dashboard: Dashboard): ParsedDashboard {
    try {
      const panels = JSON.parse(dashboard.attributes.panelsJSON);
      return {
        ...dashboard,
        attributes: {
          ...dashboard.attributes,
          panels,
        },
      };
    } catch (e) {
      this.logger.error(`Failed to parse dashboard panels for ${dashboard.id}`);
      return {
        ...dashboard,
        attributes: {
          ...dashboard.attributes,
          panels: [],
        },
      };
    }
  }
}
