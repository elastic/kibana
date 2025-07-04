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
}

export enum TelemetryEventTypes {
  RELATED_ALERTS_LOADED = 'Related Alerts Loaded',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes.RELATED_ALERTS_LOADED;
  schema: RootSchema<RelatedAlertsLoadedParams>;
}

export interface RelatedAlertsLoadedParams {
  count: number;
}

export type TelemetryEventParams = RelatedAlertsLoadedParams;
