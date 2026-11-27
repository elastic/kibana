/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_DETECTION_ENGINE_URL } from '../../../constants';

export const RULE_MANAGEMENT_FILTERS_URL = `${INTERNAL_DETECTION_ENGINE_URL}/rules/_rule_management_filters`;
export const RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL = `${INTERNAL_DETECTION_ENGINE_URL}/rules/_coverage_overview`;
export const RULE_MANAGEMENT_RULES_URL_SEARCH =
  `${INTERNAL_DETECTION_ENGINE_URL}/rules/_search` as const;
/** Installs the workflow that keeps the rule search index of the current space up to date. */
export const RULE_MANAGEMENT_RULE_SEARCH_INDEX_WORKFLOW_URL =
  `${RULE_MANAGEMENT_RULES_URL_SEARCH}_index/_workflow` as const;
/** Whether search by meaning is available, off, indexing or ready in the current space. */
export const RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL =
  `${RULE_MANAGEMENT_RULES_URL_SEARCH}_index/_status` as const;
export const RULE_HISTORY_URL =
  `${INTERNAL_DETECTION_ENGINE_URL}/rules/{ruleId}/history/_list` as const;
export const RULE_RESTORE_FROM_HISTORY_URL =
  `${INTERNAL_DETECTION_ENGINE_URL}/rules/{ruleId}/history/{changeId}/_restore` as const;
