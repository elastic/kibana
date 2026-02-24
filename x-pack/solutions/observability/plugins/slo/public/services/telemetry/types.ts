/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';

export interface SloTelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export interface SloDetailsFlyoutViewedParams {
  origin: string;
  sloId: string;
}

export interface SloDetailsFlyoutTabChangedParams {
  origin: string;
  sloId: string;
  tabId: string;
}

export interface SloDetailsFlyoutOpenInAppClickedParams {
  origin: string;
  sloId: string;
}

export interface SloCreateFlyoutViewedParams {
  origin: string;
}

export type SloTelemetryEventParams =
  | SloDetailsFlyoutViewedParams
  | SloDetailsFlyoutTabChangedParams
  | SloDetailsFlyoutOpenInAppClickedParams
  | SloCreateFlyoutViewedParams;

export interface ISloTelemetryClient {
  reportSloDetailsFlyoutViewed(params: SloDetailsFlyoutViewedParams): void;
  reportSloDetailsFlyoutTabChanged(params: SloDetailsFlyoutTabChangedParams): void;
  reportSloDetailsFlyoutOpenInAppClicked(params: SloDetailsFlyoutOpenInAppClickedParams): void;
  reportSloCreateFlyoutViewed(params: SloCreateFlyoutViewedParams): void;
}

export enum SloTelemetryEventTypes {
  SLO_DETAILS_FLYOUT_VIEWED = 'SLO Details Flyout Viewed',
  SLO_DETAILS_FLYOUT_TAB_CHANGED = 'SLO Details Flyout Tab Changed',
  SLO_DETAILS_FLYOUT_OPEN_IN_APP_CLICKED = 'SLO Details Flyout Open In App Clicked',
  SLO_CREATE_FLYOUT_VIEWED = 'SLO Create Flyout Viewed',
}

export interface SloTelemetryEvent {
  eventType: SloTelemetryEventTypes;
  schema: RootSchema<SloTelemetryEventParams>;
}
