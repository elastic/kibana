/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../common/api/detection_engine';

/**
 * We subtract 4px from each column width to account for the 8px gap between the columns
 */
export const DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS: [string, string] = [
  'calc(50% - 4px)',
  'calc(50% - 4px)',
];
export const LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS: [string, string] = [
  'calc(30% - 4px)',
  'calc(70% - 4px)',
];

export const ABOUT_UPGRADE_FIELD_ORDER: Array<keyof DiffableAllFields> = [
  'version',
  'name',
  'description',
  'building_block',
  'investigation_fields',
  'severity',
  'severity_mapping',
  'risk_score',
  'risk_score_mapping',
  'references',
  'false_positives',
  'rule_name_override',
  'threat',
  'threat_indicator_path',
  'timestamp_override',
  'tags',
];

export const DEFINITION_UPGRADE_FIELD_ORDER: Array<keyof DiffableAllFields> = [
  'data_source',
  'type',
  'kql_query',
  'eql_query',
  'esql_query',
  'anomaly_threshold',
  'machine_learning_job_id',
  'related_integrations',
  'required_fields',
  'timeline_template',
  'threshold',
  'threat_index',
  'threat_mapping',
  'threat_query',
  'threat_indicator_path',
  'new_terms_fields',
  'history_window_start',
  'max_signals',
  'alert_suppression',
];

export const SCHEDULE_UPGRADE_FIELD_ORDER: Array<keyof DiffableAllFields> = ['rule_schedule'];

export const SETUP_UPGRADE_FIELD_ORDER: Array<keyof DiffableAllFields> = ['setup', 'note'];

/**
 * This order is derived from a combination of the Rule Details Flyout display order
 * and the `DiffableRule` type that is returned from the rule diff API endpoint
 */
export const UPGRADE_FIELD_ORDER: Array<keyof DiffableAllFields> = [
  // Rule About fields
  ...ABOUT_UPGRADE_FIELD_ORDER,
  // Rule Definition fields
  ...DEFINITION_UPGRADE_FIELD_ORDER,
  // Rule Schedule fields
  ...SCHEDULE_UPGRADE_FIELD_ORDER,
  // Rule Setup fields
  ...SETUP_UPGRADE_FIELD_ORDER,
];
