/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkActionTypeEnum,
  BulkActionsDryRunErrCode,
} from '../../../../../../common/api/detection_engine/rule_management';

/**
 * Only 3 bulk actions are supported for for confirmation dry run modal:
 * * export
 * * edit
 * * manual rule run
 */
export type BulkActionForConfirmation =
  | BulkActionTypeEnum['export']
  | BulkActionTypeEnum['edit']
  | BulkActionTypeEnum['run'];

/**
 * transformed results of dry run
 */
export interface DryRunResult {
  /**
   * total number of rules that succeeded validation in dry run
   */
  succeededRulesCount?: number;
  /**
   * total number of rules that failed validation in dry run
   */
  failedRulesCount?: number;
  /**
   * rule failures errors(message and error code) and ids of rules, that failed
   */
  ruleErrors: Array<{
    message: string;
    errorCode?: BulkActionsDryRunErrCode;
    ruleIds: string[];
  }>;
}
