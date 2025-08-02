/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import { isDashboardSection } from '@kbn/dashboard-plugin/common';
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
import { isSuggestedDashboardsValidRuleTypeId } from './helpers';
import {
  DashboardScorer,
  RankablePanel,
  RankSourceAlert,
  RankableDashboard,
} from './dashboard_scorer';

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
    // make sure it is an o11y alert
    if (!isSuggestedDashboardsValidRuleTypeId(alert.getRuleTypeId())) return [];

    const ruleName = this.alert?.getRuleName();

    const ruleQueryFields = Object.keys(extractKQLFieldsAndValues(alert.getRuleParameters()));

    console.log('!!!ALERT IS', alert);

    console.log('RRF', ruleName, ruleQueryFields);
    const alertRuleIndex = this.getRuleQueryIndex();

    const rsa: RankSourceAlert = {
      name: ruleName || '',
      description: '',
      queriedFields: ruleQueryFields,
      indexPattern: alertRuleIndex || '',
    };

    let rankableDashboards: RankableDashboard[] = [];
    // append all rankable dashboards
    const dashboardIndices = new Set<string>();
    this.dashboardsById.forEach((dashboard) => {
      let rankablePanels: RankablePanel[] = [];
      // append all rankable panelsnd
      dashboard.attributes.panels.forEach((panel) => {
        if (isDashboardSection(panel)) return; // skip sections
        const panelIndices = this.getPanelIndices(panel);

        panelIndices.forEach((d) => dashboardIndices.add(d));

        const panelFields = this.getPanelFields(panel);
        if (panelIndices.size > 0 || panelFields.size > 0) {
          rankablePanels.push({
            title: panel.panelConfig?.attributes?.title || 'Untitled Panel',
            queriedFields: Array.from(panelFields),
          });
        }
      });

      // Parse the date string for last modified from either dashboard.updated_at or dashboard.created_at
      const lastModifiedDate = new Date(
        dashboard.updated_at || dashboard.created_at || new Date().toISOString()
      );

      const rankableDashboard: RankableDashboard = {
        id: dashboard.id,
        title: dashboard.attributes.title,
        description: dashboard.attributes.description,
        panels: rankablePanels,
        indexPatterns: Array.from(dashboardIndices),
        lastModifiedDate,
        isManaged: dashboard.managed || false,
      };
      rankableDashboards.push(rankableDashboard);
    });

    console.log('Rankable dashboards:', JSON.stringify(rankableDashboards, null, 2));

    const dashboardScorer = new DashboardScorer(rsa);
    const scoredDashboards = dashboardScorer.getScores(rankableDashboards);
    console.log('Scored dashboards:', JSON.stringify(scoredDashboards, null, 2));

    // Take the top scored dashboards and map them to SuggestedDashboard format
    const suggestedDashboards: SuggestedDashboard[] = scoredDashboards
      .slice(0, 10)
      .map(({ dashboard, score, scoreBreakdown }) => {
        // Get relevant panels from the score breakdown
        const relevantPanels = scoreBreakdown.panelScores
          // Filter out panels with low contribution scores
          .filter((panelScore) => panelScore.contributionToOverall > 0)
          // Map to the RelevantPanel format
          .map((panelScore) => ({
            panel: {
              panelIndex: uuidv4(), // Generate a unique ID for the panel
              type: 'lens', // Assuming lens type, which is common for visualizations
              title: panelScore.panel.title,
              // Include panel configuration with title
              panelConfig: {
                title: panelScore.panel.title,
                attributes: {
                  title: panelScore.panel.title,
                },
              },
            },
            matchedBy: {
              // Include matched fields from the panel's field contributions
              fields: panelScore.fieldContributions
                .filter((fc) => !fc.isIndexPattern)
                .map((fc) => fc.field),
              // Include matched index patterns
              index: panelScore.fieldContributions
                .filter((fc) => fc.isIndexPattern)
                .map((fc) => fc.field.replace('[index] ', '')),
            },
          }));

        return {
          id: dashboard.id,
          title: dashboard.title,
          description: dashboard.description,
          score: score,
          matchedBy: {
            // Extract matched fields from field contributions
            fields: scoreBreakdown.fieldContributions
              .filter((fc) => !fc.isIndexPattern)
              .map((fc) => fc.field),
            // Extract matched index patterns
            index: dashboard.indexPatterns,
            panels: [],
          },
          relevantPanelCount: relevantPanels.length,
          relevantPanels: relevantPanels,
        };
      });
    return suggestedDashboards;
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

  private async fetchFirst500Dashboards() {
    await this.fetchDashboards({ page: 1, perPage: 500, limit: 500 });
  }

  private getDashboardsByIndex(index: string): {
    dashboards: SuggestedDashboard[];
  } {
    const relevantDashboards: SuggestedDashboard[] = [];
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

  private getPanelsByIndex(index: string, panels: DashboardAttributes['panels']): DashboardPanel[] {
    const panelsByIndex = panels.filter((p) => {
      if (isDashboardSection(p)) return false; // filter out sections
      const panelIndices = this.getPanelIndices(p);
      return panelIndices.has(index);
    }) as DashboardPanel[]; // filtering with type guard doesn't actually limit type, so need to cast
    return panelsByIndex;
  }

  private getPanelsByField(
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

  private getPanelIndices(panel: DashboardPanel): Set<string> {
    const emptyIndicesSet = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const maybeLensAttr = panel.panelConfig.attributes;
        if (this.isLensVizAttributes(maybeLensAttr)) {
          const lensIndices = this.getLensVizIndices(maybeLensAttr);
          return lensIndices;
        }
        return emptyIndicesSet;
      default:
        return emptyIndicesSet;
    }
  }

  private getPanelFields(panel: DashboardPanel): Set<string> {
    const emptyFieldsSet = new Set<string>();
    switch (panel.type) {
      case 'lens':
        const maybeLensAttr = panel.panelConfig.attributes;
        if (this.isLensVizAttributes(maybeLensAttr)) {
          const lensFields = this.getLensVizFields(maybeLensAttr);
          return lensFields;
        }
        return emptyFieldsSet;
      default:
        return emptyFieldsSet;
    }
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

  private getLensVizIndices(lensAttr: LensAttributes): Set<string> {
    const indices = new Set(
      lensAttr.references
        .filter((r) => r.name.match(`indexpattern`))
        .map((reference) => reference.id)
    );
    return indices;
  }

  private getLensVizFields(lensAttr: LensAttributes): Set<string> {
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

// TODO: We probably have a KQL utility that does this already,
function extractKQLFieldsAndValues(ruleParams: any): Record<string, string> {
  const extractedFields: Record<string, string> = {};

  // Check if searchConfiguration exists and has a query
  if (
    ruleParams?.searchConfiguration?.query?.query &&
    ruleParams.searchConfiguration.query.language === 'kuery'
  ) {
    const kqlQuery = ruleParams.searchConfiguration.query.query as string;

    // Simple regex to extract field:value pairs
    // This handles basic cases like 'field: "value"' or 'field: value'
    const fieldValueRegex = /(\w+)\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/g;

    let match;
    while ((match = fieldValueRegex.exec(kqlQuery)) !== null) {
      const fieldName = match[1];
      // The value could be in any of the capture groups depending on whether it was quoted or not
      const fieldValue = match[2] || match[3] || match[4];
      extractedFields[fieldName] = fieldValue;
    }
  }

  return extractedFields;
}
