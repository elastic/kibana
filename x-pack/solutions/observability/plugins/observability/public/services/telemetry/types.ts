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
}

export enum TelemetryEventTypes {
  RELATED_ALERTS_LOADED = 'Related Alerts Loaded',
  ALERT_DETAILS_PAGE_VIEW = 'Alert Details Page View',
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

export type TelemetryEvent = AlertDetailsPageViewEvent | RelatedAlertsLoadedEvent;

export type TelemetryEventParams = RelatedAlertsLoadedParams | AlertDetailsPageViewParams;
