/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EntityDetailsLeftPanelTab {
  RISK_INPUTS = 'risk_inputs',
  ANOMALIES = 'anomalies',
  OKTA = 'okta_document',
  ENTRA = 'entra_document',
  CSP_INSIGHTS = 'csp_insights',
  FIELDS_TABLE = 'fields_table',
  GRAPH_VIEW = 'graph_view',
  RESOLUTION_GROUP = 'resolution_group',
}

export enum CspInsightLeftPanelSubTab {
  MISCONFIGURATIONS = 'misconfigurationTabId',
  VULNERABILITIES = 'vulnerabilitiesTabId',
  ALERTS = 'alertsTabId',
}

export enum RiskScoreLeftPanelSubTab {
  ENTITY = 'entity',
  RESOLUTION = 'resolution',
}

export interface EntityDetailsPath {
  tab: EntityDetailsLeftPanelTab;
  subTab?: CspInsightLeftPanelSubTab | RiskScoreLeftPanelSubTab;
}
