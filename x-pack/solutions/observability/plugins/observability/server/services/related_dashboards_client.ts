/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { Logger } from '@kbn/core/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { RelevantPanel, RelatedDashboard } from '@kbn/observability-schema';
import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;
export class RelatedDashboardsClient {
  private dashboardsById = new Map<string, Dashboard>();
  private alert: AlertData | null = null;

  constructor(
    private logger: Logger,
    private dashboardClient: IContentClient<Dashboard>,
    private alertsClient: InvestigateAlertsClient,
    private alertId: string
  ) {}

  async fetchSuggestedDashboards(): Promise<{ suggestedDashboards: RelatedDashboard[] }> {
    const allRelatedDashboards = new Set<RelatedDashboard>();
    const relevantDashboardsById = new Map<string, RelatedDashboard>();
    const [alert] = await Promise.all([
      this.alertsClient.getAlertById(this.alertId),
      this.fetchAllDashboards(),
    ]);
    this.alert = alert;
    if (!this.alert) {
      return { suggestedDashboards: [] };
    }
    const index = await this.getRuleQueryIndex();
    const relevantRuleFields = this.alert.getRelevantRuleFields();
    const relevantAlertFields = this.alert.getRelevantAADFields();
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
    return { suggestedDashboards: Array.from(relevantDashboardsById.values()) };
  }

  async fetchDashboards(page: number) {
    const perPage = 1000;
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
    await this.fetchDashboards(page + 1);
  }

  async fetchAllDashboards() {
    await this.fetchDashboards(1);
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
        });
      }
    });
    return { dashboards: relevantDashboards };
  }

  getPanelsByIndex(index: string, panels: DashboardPanel[]): DashboardPanel[] {
    const panelsByIndex = panels.filter((p) => {
      const panelIndices = this.getPanelIndices(p);
      return panelIndices.has(index);
    });
    return panelsByIndex;
  }

  getPanelsByField(
    fields: string[],
    panels: DashboardPanel[]
  ): Array<{ matchingFields: Set<string>; panel: DashboardPanel }> {
    const panelsByField = panels.reduce((acc, p) => {
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

  async getRuleQueryIndex(): Promise<string> {
    if (!this.alert) {
      throw new Error('Alert not found. Could not get the rule query index.');
    }
    const index = this.alert.getRuleQueryIndex();
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
}
