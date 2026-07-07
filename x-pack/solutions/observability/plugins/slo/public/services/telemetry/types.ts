/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { IndicatorType } from '@kbn/slo-schema';

export interface SloDetailsFlyoutTabChangedParams {
  tabId: string;
}

export interface SloCreateFlyoutViewedParams {
  sloType?: IndicatorType;
}

export interface SloCreatedParams {
  slo_id: string;
  template_id?: string;
}

export interface SloEditedParams {
  slo_id: string;
}

export interface SloDeletedParams {
  slo_id: string;
}

export interface SloClonedParams {
  slo_id: string;
}

export interface SloResetParams {
  slo_id: string;
}

export type SloTelemetryEventParams =
  | SloDetailsFlyoutTabChangedParams
  | SloCreateFlyoutViewedParams
  | SloCreatedParams
  | SloEditedParams
  | SloDeletedParams
  | SloClonedParams
  | SloResetParams
  | Record<string, never>;

export interface ISloTelemetryClient {
  reportSloDetailsFlyoutViewed(): void;
  reportSloDetailsFlyoutTabChanged(params: SloDetailsFlyoutTabChangedParams): void;
  reportSloCreateFlyoutViewed(params: SloCreateFlyoutViewedParams): void;
  reportSloCreated(params: SloCreatedParams): void;
  reportSloEdited(params: SloEditedParams): void;
  reportSloDeleted(params: SloDeletedParams): void;
  reportSloCloned(params: SloClonedParams): void;
  reportSloReset(params: SloResetParams): void;
}

export enum SloTelemetryEventTypes {
  SLO_DETAILS_FLYOUT_VIEWED = 'slo_details_flyout_viewed',
  SLO_DETAILS_FLYOUT_TAB_CHANGED = 'slo_details_flyout_tab_changed',
  SLO_CREATE_FLYOUT_VIEWED = 'slo_create_flyout_viewed',
  SLO_CREATED = 'slo_created',
  SLO_EDITED = 'slo_edited',
  SLO_DELETED = 'slo_deleted',
  SLO_CLONED = 'slo_cloned',
  SLO_RESET = 'slo_reset',
}

export interface SloTelemetryEvent {
  eventType: SloTelemetryEventTypes;
  schema: RootSchema<SloTelemetryEventParams> | Record<string, never>;
}
