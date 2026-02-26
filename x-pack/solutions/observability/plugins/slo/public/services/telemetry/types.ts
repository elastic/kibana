/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export interface SloDetailsFlyoutTabChangedParams {
  tabId: string;
}

export type SloTelemetryEventParams = SloDetailsFlyoutTabChangedParams;

export interface ISloTelemetryClient {
  reportSloDetailsFlyoutViewed(): void;
  reportSloDetailsFlyoutTabChanged(params: SloDetailsFlyoutTabChangedParams): void;
  reportSloDetailsFlyoutOpenInAppClicked(): void;
  reportSloCreateFlyoutViewed(): void;
}

export enum SloTelemetryEventTypes {
  SLO_DETAILS_FLYOUT_VIEWED = 'SLO Details Flyout Viewed',
  SLO_DETAILS_FLYOUT_TAB_CHANGED = 'SLO Details Flyout Tab Changed',
  SLO_DETAILS_FLYOUT_OPEN_IN_APP_CLICKED = 'SLO Details Flyout Open In App Clicked',
  SLO_CREATE_FLYOUT_VIEWED = 'SLO Create Flyout Viewed',
}

export interface SloTelemetryEvent {
  eventType: SloTelemetryEventTypes;
  schema: RootSchema<SloTelemetryEventParams> | Record<string, never>;
}
