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
  reportAlertAddedToCase(newCaseCreated: boolean, from: string, ruleTypeId: string): void;
  reportLinkedDashboardViewed(ruleTypeId: string): void;
}

export enum TelemetryEventTypes {
  RELATED_ALERTS_LOADED = 'Related Alerts Loaded',
  ALERT_DETAILS_PAGE_VIEW = 'Alert Details Page View',
  ALERT_ADDED_TO_CASE = 'Alert Added to Case',
  LINKED_DASHBOARD_VIEW = 'Linked Dashboard View',
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

interface AlertAddedToCaseParams {
  new_case_created: boolean;
  from: string;
  rule_type_id: string;
}

interface AlertAddedToCaseEvent {
  eventType: TelemetryEventTypes.ALERT_ADDED_TO_CASE;
  schema: RootSchema<AlertAddedToCaseParams>;
}
interface LinkedDashboardViewParams {
  rule_type_id: string;
}

interface LinkedDashboardViewEvent {
  eventType: TelemetryEventTypes.LINKED_DASHBOARD_VIEW;
  schema: RootSchema<LinkedDashboardViewParams>;
}

export type TelemetryEvent =
  | AlertDetailsPageViewEvent
  | RelatedAlertsLoadedEvent
  | AlertAddedToCaseEvent
  | LinkedDashboardViewEvent;

export type TelemetryEventParams =
  | RelatedAlertsLoadedParams
  | AlertDetailsPageViewParams
  | AlertAddedToCaseParams
  | LinkedDashboardViewParams;
