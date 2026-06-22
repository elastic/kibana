/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

export const BEHAVIORAL_ANOMALIES_SECTION_TEST_ID = `${PREFIX}BehavioralAnomaliesSection` as const;
// Prototype-only selector that toggles between v.1 and v.2 of the section
// content. Remove this test id along with the selector itself before hand-off.
export const BEHAVIORAL_ANOMALIES_VERSION_SELECTOR_TEST_ID =
  `${PREFIX}BehavioralAnomaliesVersionSelector` as const;
// Prototype-only "Last 1 year" badge rendered on the section title when the
// v.2 overview is selected. Remove with the v.2 overview.
export const BEHAVIORAL_ANOMALIES_V2_OVERVIEW_TIMEFRAME_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2OverviewTimeframe` as const;
export const BEHAVIORAL_ANOMALIES_OVERVIEW_TEST_ID = `${PREFIX}BehavioralAnomaliesOverview` as const;
export const BEHAVIORAL_ANOMALIES_COUNT_TEST_ID = `${PREFIX}BehavioralAnomaliesCount` as const;
export const BEHAVIORAL_ANOMALIES_HEATMAP_TEST_ID = `${PREFIX}BehavioralAnomaliesHeatmap` as const;
// Prototype-only count + chain for the MITRE ATT&CK tactics row in the v.2
// overview. Remove with the v.2 overview / `mitre/` folder.
export const BEHAVIORAL_ANOMALIES_V2_TACTICS_COUNT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TacticsCount` as const;
export const BEHAVIORAL_ANOMALIES_V2_TACTICS_CHAIN_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV2TacticsChain` as const;
// Prototype-only count + chain for the MITRE ATT&CK tactics row in the v.3
// overview (v.3 renders ONLY the chain — no swim lane). Remove with the v.3
// overview file.
export const BEHAVIORAL_ANOMALIES_V3_OVERVIEW_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3Overview` as const;
export const BEHAVIORAL_ANOMALIES_V3_TACTICS_COUNT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TacticsCount` as const;
export const BEHAVIORAL_ANOMALIES_V3_TACTICS_CHAIN_TEST_ID =
  `${PREFIX}BehavioralAnomaliesV3TacticsChain` as const;
export const BEHAVIORAL_ANOMALIES_TAB_CONTENT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTabContent` as const;
export const BEHAVIORAL_ANOMALIES_TIMELINE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTimelineSection` as const;
export const BEHAVIORAL_ANOMALIES_TIMELINE_SWIMLANE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTimelineSwimlane` as const;
export const BEHAVIORAL_ANOMALIES_TIMELINE_MANAGE_ML_JOBS_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTimelineManageMlJobs` as const;
export const BEHAVIORAL_ANOMALIES_SEVERITY_LEGEND_TEST_ID =
  `${PREFIX}BehavioralAnomaliesSeverityLegend` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_SECTION_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableSection` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_TEST_ID = `${PREFIX}BehavioralAnomaliesTable` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_JOB_NAME_LINK_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableJobNameLink` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionsButton` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_MENU_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionsMenu` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionAddToCase` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_TIMELINE_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionAddToTimeline` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_DISCOVER_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionViewInDiscover` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_VIEW_IN_SMV_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionViewInSingleMetricViewer` as const;
export const BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID =
  `${PREFIX}BehavioralAnomaliesTableRowActionAddToChat` as const;
