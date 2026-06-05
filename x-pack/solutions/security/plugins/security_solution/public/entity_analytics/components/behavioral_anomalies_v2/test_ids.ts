/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

/*
 * Prototype "BA-v.2" test IDs. Each constant uses a `BehavioralAnomaliesV2*`
 * DOM suffix so v1 and v2 can render side-by-side in the same flyout without
 * `data-test-subj` collisions.
 */

export const BEHAVIORAL_ANOMALIES_V2_TAB_CONTENT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TabContent` as const;
export const BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2AttackChainSection` as const;
export const BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2AttackChain` as const;
export const BEHAVIORAL_ANOMALIES_V2_TACTIC_FILTER_PILL_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TacticFilterPill` as const;
export const BEHAVIORAL_ANOMALIES_V2_TIMELINE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TimelineSection` as const;
export const BEHAVIORAL_ANOMALIES_V2_TIMELINE_SWIMLANE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TimelineSwimlane` as const;
// Date picker and "Manage ML jobs" button live at the top of the BA-v.2 tab
// content (not inside the Anomaly timeline section), hence the tab-scoped names.
export const BEHAVIORAL_ANOMALIES_V2_MANAGE_ML_JOBS_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2ManageMlJobs` as const;
export const BEHAVIORAL_ANOMALIES_V2_DATE_PICKER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2DatePicker` as const;
export const BEHAVIORAL_ANOMALIES_V2_SEVERITY_LEGEND_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2SeverityLegend` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableSection` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2Table` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_JOB_NAME_LINK_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableJobNameLink` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_BADGE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableTacticBadge` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_OVERFLOW_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableTacticOverflow` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_POPOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableTacticPopover` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_EXPANDER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowExpander` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_DESCRIPTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowDescription` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_BUTTON_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowActionsButton` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_MENU_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowActionsMenu` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTION_ADD_TO_TIMELINE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowActionAddToTimeline` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTION_VIEW_IN_DISCOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowActionViewInDiscover` as const;
export const BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTION_VIEW_IN_SMV_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TableRowActionViewInSingleMetricViewer` as const;
