/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

/*
 * Prototype "BA-v.3" test IDs. Each constant uses a `BehavioralAnomaliesV3*`
 * DOM suffix so v1, v2 and v3 can render side-by-side in the same flyout without
 * `data-test-subj` collisions.
 */

export const BEHAVIORAL_ANOMALIES_V3_TAB_CONTENT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TabContent` as const;
export const BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3AttackChainSection` as const;
export const BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3AttackChain` as const;
// Collapsible accordion that wraps the Attack chain section.
export const BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_ACCORDION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3AttackChainAccordion` as const;
export const BEHAVIORAL_ANOMALIES_V3_TACTIC_FILTER_PILL_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TacticFilterPill` as const;
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineSection` as const;
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_SWIMLANE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineSwimlane` as const;
// Anomaly timeline title accordion + info popover trigger / panel / docs link.
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_ACCORDION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineAccordion` as const;
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_BUTTON_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineInfoButton` as const;
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_POPOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineInfoPopover` as const;
export const BEHAVIORAL_ANOMALIES_V3_TIMELINE_INFO_DOCS_LINK_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TimelineInfoDocsLink` as const;
// Anomalies table title accordion (collapsible Anomalies section).
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ACCORDION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableAccordion` as const;
// Question-mark icon + tooltip in the Anomaly score column header.
export const BEHAVIORAL_ANOMALIES_V3_TABLE_SCORE_HEADER_TOOLTIP_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableScoreHeaderTooltip` as const;
// Date picker and "Manage ML jobs" button live at the top of the BA-v.3 tab
// content (not inside the Anomaly timeline section), hence the tab-scoped names.
export const BEHAVIORAL_ANOMALIES_V3_MANAGE_ML_JOBS_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3ManageMlJobs` as const;
export const BEHAVIORAL_ANOMALIES_V3_DATE_PICKER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3DatePicker` as const;
export const BEHAVIORAL_ANOMALIES_V3_SEVERITY_LEGEND_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3SeverityLegend` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableSection` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3Table` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_JOB_NAME_LINK_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableJobNameLink` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_BADGE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableTacticBadge` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_OVERFLOW_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableTacticOverflow` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_POPOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableTacticPopover` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPANDER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowExpander` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_DESCRIPTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowDescription` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowExplainer` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPLAINER_SPIKE_BADGE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowExplainerSpikeBadge` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_COUNT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowCountOfSourceEvents` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_KEY_FIELDS_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowKeyFields` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_ACTIONS_BUTTON_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowActionsButton` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_ACTIONS_MENU_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowActionsMenu` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_ACTION_ADD_TO_TIMELINE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowActionAddToTimeline` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_ACTION_VIEW_IN_DISCOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowActionViewInDiscover` as const;
export const BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_ACTION_VIEW_IN_SMV_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TableRowActionViewInSingleMetricViewer` as const;
