/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

/**
 * Which top-level v2 (EUI-based, `overlays.openSystemFlyout`) flyout was opened or closed.
 */
export type FlyoutType =
  | 'document'
  | 'attack'
  | 'ioc'
  | 'network'
  | 'rule'
  | 'host'
  | 'user'
  | 'service'
  | 'generic';

/**
 * Which "tool" (child) flyout was opened or closed.
 */
export type FlyoutTool =
  | 'analyzer'
  | 'session_view'
  | 'correlations'
  | 'entities'
  | 'response'
  | 'prevalence'
  | 'threat_intelligence'
  | 'investigation_guide'
  | 'graph'
  | 'notes'
  | 'risk_inputs'
  | 'anomaly_insights'
  | 'alerts_insights'
  | 'misconfiguration_insights'
  | 'vulnerability_insights'
  | 'entra_insights'
  | 'okta_insights'
  | 'resolution'
  | 'fields_table'
  | 'graph_view';

/**
 * Where the open action originated from, when known.
 */
export type FlyoutOrigin =
  | 'alerts_table'
  | 'graph'
  | 'correlations'
  | 'field_link'
  | 'related_entity'
  | 'session_view'
  | 'title';

/**
 * Which tab was selected inside a flyout's main panel. Today every `useTabs` consumer uses
 * `'overview' | 'table' | 'json'`, but the reported event accepts any string (see
 * `ReportFlyoutTabClickedParams`) so the generic `useTabs` hook isn't coupled to this union.
 */
export type FlyoutTabId = 'overview' | 'table' | 'json';

/**
 * Whether the flyout replaced the top-level session (`start`) or was nested inside the
 * currently open flyout's history stack (`inherit`). Mirrors
 * `OverlaySystemFlyoutOpenOptions['session']`.
 */
export type FlyoutSessionKind = 'start' | 'inherit';

export enum FlyoutV2EventTypes {
  FlyoutOpened = 'Flyout V2 Opened',
  FlyoutClosed = 'Flyout V2 Closed',
  FlyoutTabClicked = 'Flyout V2 Tab Clicked',
}

/** Whether the opened flyout was a top-level flyout or one of its child tools. */
export type FlyoutSurface = 'flyout' | 'tool';

interface ReportFlyoutOpenedParams {
  surface: FlyoutSurface;
  flyoutType?: FlyoutType;
  tool?: FlyoutTool;
  session: FlyoutSessionKind;
  origin?: FlyoutOrigin;
}

interface ReportFlyoutClosedParams {
  flyoutType?: FlyoutType;
  tool?: FlyoutTool;
  session: FlyoutSessionKind;
  durationMs: number;
}

interface ReportFlyoutTabClickedParams {
  flyoutType: FlyoutType;
  tabId: string;
}

export interface FlyoutV2TelemetryEventsMap {
  [FlyoutV2EventTypes.FlyoutOpened]: ReportFlyoutOpenedParams;
  [FlyoutV2EventTypes.FlyoutClosed]: ReportFlyoutClosedParams;
  [FlyoutV2EventTypes.FlyoutTabClicked]: ReportFlyoutTabClickedParams;
}

export interface FlyoutV2TelemetryEvent {
  eventType: FlyoutV2EventTypes;
  schema: RootSchema<FlyoutV2TelemetryEventsMap[FlyoutV2EventTypes]>;
}
