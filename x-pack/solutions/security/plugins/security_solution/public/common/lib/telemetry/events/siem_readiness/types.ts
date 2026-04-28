/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum SiemReadinessEventTypes {
  TabVisited = 'SIEM Readiness Tab Visited',
  IntegrationPopoverOpened = 'SIEM Readiness Integration Popover Opened',
  IntegrationClicked = 'SIEM Readiness Integration Clicked',
  RuleViewToggled = 'SIEM Readiness Rule View Toggled',
}

interface ReportSiemReadinessTabVisitedParams {
  tabId: string;
}

interface ReportSiemReadinessIntegrationPopoverOpenedParams {
  source: string;
}

interface ReportSiemReadinessIntegrationClickedParams {
  integrationPackage: string;
  source: string;
}

interface ReportSiemReadinessRuleViewToggledParams {
  view: 'all_rules' | 'mitre_attack';
}

export interface SiemReadinessTelemetryEventsMap {
  [SiemReadinessEventTypes.TabVisited]: ReportSiemReadinessTabVisitedParams;
  [SiemReadinessEventTypes.IntegrationPopoverOpened]: ReportSiemReadinessIntegrationPopoverOpenedParams;
  [SiemReadinessEventTypes.IntegrationClicked]: ReportSiemReadinessIntegrationClickedParams;
  [SiemReadinessEventTypes.RuleViewToggled]: ReportSiemReadinessRuleViewToggledParams;
}

export interface SiemReadinessTelemetryEvent {
  eventType: SiemReadinessEventTypes;
  schema: RootSchema<SiemReadinessTelemetryEventsMap[SiemReadinessEventTypes]>;
}
