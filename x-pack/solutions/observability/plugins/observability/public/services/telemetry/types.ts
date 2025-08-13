/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core-analytics-browser';

export type TelemetryServiceStart = ITelemetryClient;

export interface ITelemetryClient {
  reportRelatedAlertsLoaded(count: number): void;
  reportAlertDetailsPageView(ruleType: string): void;
  reportLinkedDashboardViewed(dashboardId: string): void;
  reportCaseSelectedFromObservability(addedFromPage: string): void;
  reportRelatedAlertAddedToCase(newCaseCreated: boolean): void;
}

export enum TelemetryEventTypes {
  RELATED_ALERTS_LOADED = 'Related Alerts Loaded',
  ALERT_DETAILS_PAGE_VIEW = 'Alert Details Page View',
  LINKED_DASHBOARD_VIEW = 'Linked Dashboard View',
  CASE_SELECTED_FROM_OBSERVABILITY = 'Case Selected From Observability',
  RELATED_ALERT_ADDED_TO_CASE = 'Related Alert Added to Case',
}

interface RelatedAlertsLoadedParams {
  count: number;
}
interface RelatedAlertsLoadedEvent {
  eventType: TelemetryEventTypes.RELATED_ALERTS_LOADED;
  schema: RootSchema<RelatedAlertsLoadedParams>;
}

interface AlertDetailsPageViewParams {
  rule_type: string;
}

interface AlertDetailsPageViewEvent {
  eventType: TelemetryEventTypes.ALERT_DETAILS_PAGE_VIEW;
  schema: RootSchema<AlertDetailsPageViewParams>;
}

interface LinkedDashboardViewParams {
  dashboard_id: string;
}

interface LinkedDashboardViewEvent {
  eventType: TelemetryEventTypes.LINKED_DASHBOARD_VIEW;
  schema: RootSchema<LinkedDashboardViewParams>;
}

interface CaseSelectedFromObservabilityParams {
  caseContext: string;
}

interface CaseSelectedFromObservabilityEvent {
  eventType: TelemetryEventTypes.CASE_SELECTED_FROM_OBSERVABILITY;
  schema: RootSchema<CaseSelectedFromObservabilityParams>;
}
interface RelatedAlertAddedToCaseParams {
  new_case_created: boolean;
}

interface RelatedAlertAddedToCaseEvent {
  eventType: TelemetryEventTypes.RELATED_ALERT_ADDED_TO_CASE;
  schema: RootSchema<RelatedAlertAddedToCaseParams>;
}

export type TelemetryEvent =
  | AlertDetailsPageViewEvent
  | RelatedAlertsLoadedEvent
  | LinkedDashboardViewEvent
  | CaseSelectedFromObservabilityEvent
  | RelatedAlertAddedToCaseEvent;

export type TelemetryEventParams =
  | RelatedAlertsLoadedParams
  | AlertDetailsPageViewParams
  | LinkedDashboardViewParams
  | CaseSelectedFromObservabilityParams
  | RelatedAlertAddedToCaseParams;
