/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ReadRuleExecutionResultsRequestBody,
  ReadRuleExecutionResultsResponse,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RuleObjectId } from '../../../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Used from route handlers to fetch and manage various information about the rule execution:
 *   - execution summary of a rule containing such data as the last status and metrics
 */
export interface IRuleExecutionLogForRoutes {
  /**
   * Fetches rule execution results for a given rule ID.
   */
  getUnifiedExecutionResults(
    args: GetUnifiedExecutionResultsArgs
  ): Promise<ReadRuleExecutionResultsResponse>;
}

export interface GetUnifiedExecutionResultsArgs {
  /** Saved object id of the rule (`rule.id`). */
  ruleId: RuleObjectId;

  /** Filtering criteria for execution results. */
  filter?: ReadRuleExecutionResultsRequestBody['filter'];

  /** Sorting configuration. */
  sort?: ReadRuleExecutionResultsRequestBody['sort'];

  /** Current page to fetch. */
  page?: number;

  /** Number of results to fetch per page. */
  perPage?: number;
}
