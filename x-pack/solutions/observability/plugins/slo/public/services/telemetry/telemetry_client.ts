/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type {
  ISloTelemetryClient,
  SloDetailsFlyoutTabChangedParams,
  SloCreateFlyoutViewedParams,
} from './types';
import { SloTelemetryEventTypes } from './types';

export class SloTelemetryClient implements ISloTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceStart) {}

  public reportSloDetailsFlyoutViewed = () => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_VIEWED, {});
  };

  public reportSloDetailsFlyoutTabChanged = (params: SloDetailsFlyoutTabChangedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_TAB_CHANGED, params);
  };

  public reportSloCreateFlyoutViewed = (params: SloCreateFlyoutViewedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_CREATE_FLYOUT_VIEWED, params);
  };
}
