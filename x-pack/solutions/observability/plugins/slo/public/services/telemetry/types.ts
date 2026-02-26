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
  reportSloDetailsFlyoutTabChanged(params: SloDetailsFlyoutTabChangedParams): void;
}

export enum SloTelemetryEventTypes {
  SLO_DETAILS_FLYOUT_VIEWED = 'slo_details_flyout_viewed',
  SLO_DETAILS_FLYOUT_TAB_CHANGED = 'slo_details_flyout_tab_changed',
  SLO_DETAILS_FLYOUT_OPEN_IN_APP_CLICKED = 'slo_details_flyout_open_in_app_clicked',
  SLO_CREATE_FLYOUT_VIEWED = 'slo_create_flyout_viewed',
}

export interface SloTelemetryEvent {
  eventType: SloTelemetryEventTypes;
  schema: RootSchema<SloTelemetryEventParams>;
}
