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
  | 'generic'
  | 'misconfiguration'
  | 'vulnerability';

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
 * Specific UI trigger the open action originated from, when known. Describes *where* the click
 * happened (a header badge, a footer menu item, a specific preview panel link, a graph node, ...)
 * rather than *which* tool/flyout it opened — that's already carried by `tool`/`flyoutType`.
 * Combine the two, e.g. `{ tool: 'notes', origin: 'footer_take_action' }`, to distinguish
 * otherwise-identical opens of the same tool from different buttons.
 */
export type FlyoutOrigin =
  // Document/attack flyout: opened from the flyout's own header vs. the footer take-action menu.
  | 'flyout_header'
  | 'footer_take_action'
  // Document overview tab preview sections (`document/main/components/*_section.tsx`).
  | 'insights_entities'
  | 'insights_threat_intel'
  | 'insights_correlations'
  | 'insights_prevalence'
  | 'visualizations_analyzer'
  | 'visualizations_session_view'
  | 'visualizations_graph'
  | 'investigation_guide'
  | 'response_section'
  | 'about_section'
  // Entity flyout left-panel detail tools (`openDetailsPanel` in `entity/*/main/index.tsx`).
  | 'risk_summary_entity'
  | 'risk_summary_resolution'
  | 'anomalies_section'
  | 'insights_alerts'
  | 'insights_misconfiguration'
  | 'insights_vulnerability'
  | 'resolution_section'
  | 'fields_section'
  // Nested navigation inside a tool flyout (graph nodes, resolution links, the tool-header title
  // button that reopens the parent document/entity flyout, the document Entities tool list,
  // session view, CSP finding rows, and clicking an alert row inside a tool's own alert list —
  // the only signal that distinguishes which tool the alert was opened from, since the resulting
  // document flyout's own event always reports `flyoutType: 'document'`).
  | 'graph_node'
  | 'graph_grouped_node'
  | 'graph_document_node'
  | 'graph_network_node'
  | 'resolution_entity_link'
  | 'tool_header_title'
  | 'entities_list'
  | 'session_view_process'
  | 'session_view_alert'
  | 'vulnerability_finding'
  | 'misconfiguration_finding'
  | 'correlations_alert'
  | 'alerts_insights_alert'
  | 'risk_inputs_alert'
  // A clickable field value (host/user/ip/rule name) inside an already-open flyout (highlighted
  // fields, the flyout's own table tab, etc.) vs. the same kind of field-value link rendered in a
  // top-level, standalone table/grid (the alerts table, timeline, network explorer, ...). Both
  // share the same shared, low-level field renderer, so this is the only signal telling them apart.
  | 'field_link'
  | 'table_field_link'
  // Top-level flyouts opened from outside any flyout.
  | 'alerts_table'
  | 'attacks_table'
  | 'attacks_kpi'
  | 'timeline'
  | 'case_attachment'
  | 'resolver_node'
  | 'note_preview'
  | 'threat_intel_table'
  // A row-action button (e.g. "Analyze event") shared across several table surfaces (alerts
  // table, timeline, rule preview, legacy flyout nav) — deliberately generic since the component
  // is reused across surfaces this union doesn't otherwise distinguish.
  | 'row_action';

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
  FlyoutActionClicked = 'Flyout V2 Action Clicked',
  FlyoutHeaderItemClicked = 'Flyout V2 Header Item Clicked',
}

/**
 * Which interactive control in the flyout header was clicked to open its popover.
 */
export type FlyoutHeaderItem = 'assignees' | 'status';

/**
 * Which action was clicked, from the document flyout's header controls or its footer's
 * "Take action" menu.
 */
export type FlyoutActionType =
  | 'add_to_case_new'
  | 'add_to_case_existing'
  | 'status_open'
  | 'status_acknowledged'
  | 'status_closed'
  | 'add_tags'
  | 'add_assignees'
  | 'remove_assignees'
  | 'add_endpoint_exception'
  | 'add_rule_exception'
  | 'isolate_host'
  | 'run_workflow'
  | 'respond'
  | 'add_note'
  | 'investigate_in_timeline'
  | 'explore';

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

interface ReportFlyoutActionClickedParams {
  flyoutType: FlyoutType;
  action: FlyoutActionType;
}

interface ReportFlyoutHeaderItemClickedParams {
  flyoutType: FlyoutType;
  item: FlyoutHeaderItem;
}

export interface FlyoutV2TelemetryEventsMap {
  [FlyoutV2EventTypes.FlyoutOpened]: ReportFlyoutOpenedParams;
  [FlyoutV2EventTypes.FlyoutClosed]: ReportFlyoutClosedParams;
  [FlyoutV2EventTypes.FlyoutTabClicked]: ReportFlyoutTabClickedParams;
  [FlyoutV2EventTypes.FlyoutActionClicked]: ReportFlyoutActionClickedParams;
  [FlyoutV2EventTypes.FlyoutHeaderItemClicked]: ReportFlyoutHeaderItemClickedParams;
}

export interface FlyoutV2TelemetryEvent {
  eventType: FlyoutV2EventTypes;
  schema: RootSchema<FlyoutV2TelemetryEventsMap[FlyoutV2EventTypes]>;
}
