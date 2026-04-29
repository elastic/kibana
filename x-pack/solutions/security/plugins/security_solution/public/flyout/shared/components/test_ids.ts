/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../test_ids';

export const FLYOUT_PREVIEW_LINK_TEST_ID = `${PREFIX}PreviewLink` as const;
export const FLYOUT_LINK_TEST_ID = `${PREFIX}Link` as const;

export const FLYOUT_ERROR_TEST_ID = `${PREFIX}Error` as const;
export const FLYOUT_LOADING_TEST_ID = `${PREFIX}Loading` as const;

export const GRAPH_PREVIEW_TEST_ID = `${PREFIX}GraphPreview` as const;
export const GRAPH_PREVIEW_LOADING_TEST_ID = `${GRAPH_PREVIEW_TEST_ID}Loading` as const;
export const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;

/* Header Navigation */

const FLYOUT_NAVIGATION_TEST_ID = `${PREFIX}Navigation` as const;
export const EXPAND_DETAILS_BUTTON_TEST_ID =
  `${FLYOUT_NAVIGATION_TEST_ID}ExpandDetailButton` as const;
export const COLLAPSE_DETAILS_BUTTON_TEST_ID =
  `${FLYOUT_NAVIGATION_TEST_ID}CollapseDetailButton` as const;
export const HEADER_ACTIONS_TEST_ID = `${FLYOUT_NAVIGATION_TEST_ID}Actions` as const;

/* History */
export const FLYOUT_HISTORY_TEST_ID = `${PREFIX}History` as const;
export const HISTORY_ROW_LOADING_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}RowLoading` as const;
export const FLYOUT_HISTORY_BUTTON_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}Button` as const;
export const FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}ContextPanel` as const;

export const DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}DocumentDetailsRow` as const;
export const ATTACK_DETAILS_HISTORY_ROW_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}AttackDetailsRow` as const;
export const RULE_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}RuleRow` as const;
export const HOST_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}HostRow` as const;
export const USER_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}UserRow` as const;
export const NETWORK_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}NetworkRow` as const;
export const GENERIC_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}GenericRow` as const;
export const NO_DATA_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}NoDataRow` as const;
export const MISCONFIGURATION_HISTORY_ROW_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}MisconfigurationRow` as const;
export const VULNERABILITY_HISTORY_ROW_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}VulnerabilityRow` as const;
export const IOC_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}IoCRow` as const;
