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
  SloCreatedParams,
  SloEditedParams,
  SloDeletedParams,
  SloClonedParams,
  SloResetParams,
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

  public reportSloCreated = (params: SloCreatedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_CREATED, params);
  };

  public reportSloEdited = (params: SloEditedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_EDITED, params);
  };

  public reportSloDeleted = (params: SloDeletedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_DELETED, params);
  };

  public reportSloCloned = (params: SloClonedParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_CLONED, params);
  };

  public reportSloReset = (params: SloResetParams) => {
    this.analytics.reportEvent(SloTelemetryEventTypes.SLO_RESET, params);
  };
}
