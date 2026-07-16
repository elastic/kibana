/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

/** Whether the opened flyout was a top-level flyout or one of its child tools. */
export const FLYOUT_SURFACE = {
  FLYOUT: 'flyout',
  TOOL: 'tool',
} as const;
export type FlyoutSurface = (typeof FLYOUT_SURFACE)[keyof typeof FLYOUT_SURFACE];

/** Which top-level v2 (EUI-based, `overlays.openSystemFlyout`) flyout was opened or closed. */
export const FLYOUT_TYPE = {
  DOCUMENT: 'document',
  ATTACK: 'attack',
  IOC: 'ioc',
  NETWORK: 'network',
  RULE: 'rule',
  HOST: 'host',
  USER: 'user',
  SERVICE: 'service',
  GENERIC: 'generic',
  MISCONFIGURATION: 'misconfiguration',
  VULNERABILITY: 'vulnerability',
} as const;
export type FlyoutType = (typeof FLYOUT_TYPE)[keyof typeof FLYOUT_TYPE];

/** Which "tool" (child) flyout was opened or closed. */
export const FLYOUT_TOOL = {
  ANALYZER: 'analyzer',
  SESSION_VIEW: 'session_view',
  CORRELATIONS: 'correlations',
  ENTITIES: 'entities',
  RESPONSE: 'response',
  PREVALENCE: 'prevalence',
  THREAT_INTELLIGENCE: 'threat_intelligence',
  INVESTIGATION_GUIDE: 'investigation_guide',
  GRAPH: 'graph',
  NOTES: 'notes',
  RISK_INPUTS: 'risk_inputs',
  ANOMALY_INSIGHTS: 'anomaly_insights',
  ALERTS_INSIGHTS: 'alerts_insights',
  MISCONFIGURATION_INSIGHTS: 'misconfiguration_insights',
  VULNERABILITY_INSIGHTS: 'vulnerability_insights',
  ENTRA_INSIGHTS: 'entra_insights',
  OKTA_INSIGHTS: 'okta_insights',
  RESOLUTION: 'resolution',
  FIELDS_TABLE: 'fields_table',
  GRAPH_VIEW: 'graph_view',
} as const;
export type FlyoutTool = (typeof FLYOUT_TOOL)[keyof typeof FLYOUT_TOOL];

/**
 * Specific UI trigger the open action originated from, when known. Describes *where* the click
 * happened (a header badge, a footer menu item, a specific preview panel link, a graph node, ...)
 * rather than *which* tool/flyout it opened — that's already carried by `tool`/`flyoutType`.
 * Combine the two, e.g. `{ tool: FLYOUT_TOOL.NOTES, origin: FLYOUT_ORIGIN.FOOTER_TAKE_ACTION }`,
 * to distinguish otherwise-identical opens of the same tool from different buttons.
 */
export const FLYOUT_ORIGIN = {
  // Document/attack flyout: opened from the flyout's own header vs. the footer take-action menu.
  FLYOUT_HEADER: 'flyout_header',
  FOOTER_TAKE_ACTION: 'footer_take_action',
  // Document overview tab preview sections (`document/main/components/*_section.tsx`).
  INSIGHTS_ENTITIES: 'insights_entities',
  INSIGHTS_THREAT_INTEL: 'insights_threat_intel',
  INSIGHTS_CORRELATIONS: 'insights_correlations',
  INSIGHTS_PREVALENCE: 'insights_prevalence',
  VISUALIZATIONS_ANALYZER: 'visualizations_analyzer',
  VISUALIZATIONS_SESSION_VIEW: 'visualizations_session_view',
  VISUALIZATIONS_GRAPH: 'visualizations_graph',
  INVESTIGATION_GUIDE: 'investigation_guide',
  RESPONSE_SECTION: 'response_section',
  ABOUT_SECTION: 'about_section',
  // Entity flyout left-panel detail tools (`openDetailsPanel` in `entity/*/main/index.tsx`).
  RISK_SUMMARY_ENTITY: 'risk_summary_entity',
  RISK_SUMMARY_RESOLUTION: 'risk_summary_resolution',
  ANOMALIES_SECTION: 'anomalies_section',
  INSIGHTS_ALERTS: 'insights_alerts',
  INSIGHTS_MISCONFIGURATION: 'insights_misconfiguration',
  INSIGHTS_VULNERABILITY: 'insights_vulnerability',
  RESOLUTION_SECTION: 'resolution_section',
  FIELDS_SECTION: 'fields_section',
  // Nested navigation inside a tool flyout (graph nodes, resolution links, the tool-header title
  // button that reopens the parent document/entity flyout, the document Entities tool list,
  // session view, CSP finding rows, and clicking an alert row inside a tool's own alert list —
  // the only signal that distinguishes which tool the alert was opened from, since the resulting
  // document flyout's own event always reports `flyoutType: FLYOUT_TYPE.DOCUMENT`).
  GRAPH_NODE: 'graph_node',
  GRAPH_GROUPED_NODE: 'graph_grouped_node',
  GRAPH_DOCUMENT_NODE: 'graph_document_node',
  GRAPH_NETWORK_NODE: 'graph_network_node',
  RESOLUTION_ENTITY_LINK: 'resolution_entity_link',
  TOOL_HEADER_TITLE: 'tool_header_title',
  ENTITIES_LIST: 'entities_list',
  SESSION_VIEW_PROCESS: 'session_view_process',
  SESSION_VIEW_ALERT: 'session_view_alert',
  VULNERABILITY_FINDING: 'vulnerability_finding',
  MISCONFIGURATION_FINDING: 'misconfiguration_finding',
  CORRELATIONS_ALERT: 'correlations_alert',
  ALERTS_INSIGHTS_ALERT: 'alerts_insights_alert',
  RISK_INPUTS_ALERT: 'risk_inputs_alert',
  // A clickable field value (host/user/ip/rule name) inside an already-open flyout (highlighted
  // fields, the flyout's own table tab, etc.) vs. the same kind of field-value link rendered in a
  // top-level, standalone table/grid (the alerts table, timeline, network explorer, ...). Both
  // share the same shared, low-level field renderer, so this is the only signal telling them apart.
  FIELD_LINK: 'field_link',
  TABLE_FIELD_LINK: 'table_field_link',
  // Top-level flyouts opened from outside any flyout.
  ALERTS_TABLE: 'alerts_table',
  ATTACKS_TABLE: 'attacks_table',
  ATTACKS_KPI: 'attacks_kpi',
  TIMELINE: 'timeline',
  CASE_ATTACHMENT: 'case_attachment',
  RESOLVER_NODE: 'resolver_node',
  NOTE_PREVIEW: 'note_preview',
  THREAT_INTEL_TABLE: 'threat_intel_table',
  // A row-action button (e.g. "Analyze event") shared across several table surfaces (alerts
  // table, timeline, rule preview, legacy flyout nav) — deliberately generic since the component
  // is reused across surfaces this union doesn't otherwise distinguish.
  ROW_ACTION: 'row_action',
} as const;
export type FlyoutOrigin = (typeof FLYOUT_ORIGIN)[keyof typeof FLYOUT_ORIGIN];

/**
 * Which tab was selected inside a flyout's main panel. Today every `useTabs` consumer uses
 * `'overview' | 'table' | 'json'`, but the reported event accepts any string (see
 * `ReportFlyoutTabClickedParams`) so the generic `useTabs` hook isn't coupled to this union.
 */
export const FLYOUT_TAB_ID = {
  OVERVIEW: 'overview',
  TABLE: 'table',
  JSON: 'json',
} as const;
export type FlyoutTabId = (typeof FLYOUT_TAB_ID)[keyof typeof FLYOUT_TAB_ID];

/**
 * Whether the flyout replaced the top-level session (`start`) or was nested inside the
 * currently open flyout's history stack (`inherit`). Mirrors
 * `OverlaySystemFlyoutOpenOptions['session']`.
 */
export const FLYOUT_SESSION_KIND = {
  START: 'start',
  INHERIT: 'inherit',
} as const;
export type FlyoutSessionKind = (typeof FLYOUT_SESSION_KIND)[keyof typeof FLYOUT_SESSION_KIND];

/** Which interactive control in the flyout header was clicked to open its popover. */
export const FLYOUT_HEADER_ITEM = {
  ASSIGNEES: 'assignees',
  STATUS: 'status',
} as const;
export type FlyoutHeaderItem = (typeof FLYOUT_HEADER_ITEM)[keyof typeof FLYOUT_HEADER_ITEM];

/**
 * Which action was clicked, from the document flyout's header controls or its footer's
 * "Take action" menu.
 */
export const FLYOUT_ACTION = {
  ADD_TO_CASE_NEW: 'add_to_case_new',
  ADD_TO_CASE_EXISTING: 'add_to_case_existing',
  STATUS_OPEN: 'status_open',
  STATUS_ACKNOWLEDGED: 'status_acknowledged',
  STATUS_CLOSED: 'status_closed',
  ADD_TAGS: 'add_tags',
  ADD_ASSIGNEES: 'add_assignees',
  REMOVE_ASSIGNEES: 'remove_assignees',
  ADD_ENDPOINT_EXCEPTION: 'add_endpoint_exception',
  ADD_RULE_EXCEPTION: 'add_rule_exception',
  ISOLATE_HOST: 'isolate_host',
  RUN_WORKFLOW: 'run_workflow',
  RESPOND: 'respond',
  ADD_NOTE: 'add_note',
  INVESTIGATE_IN_TIMELINE: 'investigate_in_timeline',
  EXPLORE: 'explore',
} as const;
export type FlyoutActionType = (typeof FLYOUT_ACTION)[keyof typeof FLYOUT_ACTION];

export enum FlyoutV2EventTypes {
  FlyoutOpened = 'Flyout V2 Opened',
  FlyoutClosed = 'Flyout V2 Closed',
  FlyoutTabClicked = 'Flyout V2 Tab Clicked',
  FlyoutActionClicked = 'Flyout V2 Action Clicked',
  FlyoutHeaderItemClicked = 'Flyout V2 Header Item Clicked',
}

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
