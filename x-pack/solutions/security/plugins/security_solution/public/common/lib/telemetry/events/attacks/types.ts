/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AttacksEventTypes {
  TableSortChanged = 'Attacks Table Sort Changed',
  ViewOptionChanged = 'Attacks View Option Changed',
  KPIViewChanged = 'Attacks KPI View Changed',
  ActionStatusUpdated = 'Attacks Action Status Updated',
  ActionAssigneeUpdated = 'Attacks Action Assignee Updated',
  ActionTagsUpdated = 'Attacks Action Tags Updated',
  ActionAddedToCase = 'Attacks Action Added To Case',
  TimelineInvestigationOpened = 'Attacks Timeline Investigation Opened',
  AIAssistantOpened = 'Attacks AI Assistant Opened',
  DetailsFlyoutOpened = 'Attacks Details Flyout Opened',
  ExpandedViewTabClicked = 'Attacks Expanded View Tab Clicked',
  ScheduleFlyoutOpened = 'Attacks Schedule Flyout Opened',
  FeaturePromotionCalloutAction = 'Attacks Feature Promotion Callout Action',
}

interface AttacksTableSortChangedParams {
  field: string;
  direction: 'asc' | 'desc';
}

interface AttacksViewOptionChangedParams {
  option: string;
  enabled: boolean;
}

interface AttacksKPIViewChangedParams {
  view: string;
}

export type AttacksActionTelemetrySource =
  | 'attacks_page_group_summary'
  | 'attacks_page_group_take_action'
  | 'attacks_page_flyout_header'
  | 'attacks_page_flyout_take_action';

export type AttacksUpdateScope = 'attack_only' | 'attack_and_related_alerts';

export interface AttacksActionBaseParams {
  source: AttacksActionTelemetrySource;
}

interface AttacksScheduleFlyoutOpenedParams {
  source: 'attacks_page_header' | 'attacks_page_empty_state';
}

interface AttacksActionStatusUpdatedParams extends AttacksActionBaseParams {
  status: string;
  scope?: AttacksUpdateScope;
}

interface AttacksActionAssigneeUpdatedParams extends AttacksActionBaseParams {
  scope?: AttacksUpdateScope;
}

interface AttacksActionTagsUpdatedParams extends AttacksActionBaseParams {
  scope?: AttacksUpdateScope;
}

interface AttacksActionAddedToCaseParams extends AttacksActionBaseParams {
  action: 'add_to_new_case' | 'add_to_existing_case';
}

interface AttacksDetailsFlyoutOpenedParams {
  id: string;
  source: 'attacks_page_table' | 'attacks_page_summary_kpi';
}

interface AttacksExpandedViewTabClickedParams {
  tab: 'summary' | 'alerts';
}

interface AttacksFeaturePromotionCalloutActionParams {
  action: 'view_attacks' | 'hide';
}

export interface AttacksTelemetryEventsMap {
  [AttacksEventTypes.TableSortChanged]: AttacksTableSortChangedParams;
  [AttacksEventTypes.ViewOptionChanged]: AttacksViewOptionChangedParams;
  [AttacksEventTypes.KPIViewChanged]: AttacksKPIViewChangedParams;
  [AttacksEventTypes.ActionStatusUpdated]: AttacksActionStatusUpdatedParams;
  [AttacksEventTypes.ActionAssigneeUpdated]: AttacksActionAssigneeUpdatedParams;
  [AttacksEventTypes.ActionTagsUpdated]: AttacksActionTagsUpdatedParams;
  [AttacksEventTypes.ActionAddedToCase]: AttacksActionAddedToCaseParams;
  [AttacksEventTypes.TimelineInvestigationOpened]: AttacksActionBaseParams;
  [AttacksEventTypes.AIAssistantOpened]: AttacksActionBaseParams;
  [AttacksEventTypes.DetailsFlyoutOpened]: AttacksDetailsFlyoutOpenedParams;
  [AttacksEventTypes.ExpandedViewTabClicked]: AttacksExpandedViewTabClickedParams;
  [AttacksEventTypes.ScheduleFlyoutOpened]: AttacksScheduleFlyoutOpenedParams;
  [AttacksEventTypes.FeaturePromotionCalloutAction]: AttacksFeaturePromotionCalloutActionParams;
}

export interface AttacksTelemetryEvent {
  eventType: AttacksEventTypes;
  schema: RootSchema<AttacksTelemetryEventsMap[AttacksEventTypes]>;
}
