/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortOrder } from '../../../../common/api/detection_engine';
import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
  GetSpaceHealthRequestBody,
  GetSpaceHealthResponse,
  ReadRuleExecutionResultsResponse,
  RuleRunType,
  UnifiedExecutionResultSortField,
  UnifiedExecutionStatus,
} from '../../../../common/api/detection_engine/rule_monitoring';

export interface IRuleMonitoringApiClient {
  /**
   * Installs resources (dashboards, data views, etc) related to rule monitoring
   * and Detection Engine health, and can do any other setup work.
   */
  setupDetectionEngineHealthApi(): Promise<void>;

  /**
   * Fetches unified rule execution results.
   * @throws An error if response is not OK.
   */
  readRuleExecutionResults(
    args: ReadRuleExecutionResultsArgs
  ): Promise<ReadRuleExecutionResultsResponse>;

  /**
   * Fetches health overview of all detection rules in the current Kibana space.
   *
   * @param params GetSpaceHealthRequestBody request parameters
   * @param signal to cancel request
   *
   * @returns Promise<GetSpaceHealthResponse> The health overview of all detection rules in the current Kibana space
   *
   * @throws An error if response is not OK
   */
  fetchSpaceRulesHealth(
    params: GetSpaceHealthRequestBody,
    signal?: AbortSignal
  ): Promise<GetSpaceHealthResponse>;

  /**
   * Fetches health overview of a specific detection rule in the current Kibana space.
   *
   * @param params GetRuleHealthRequestBody request parameters
   * @param signal to cancel request
   *
   * @returns Promise<GetRuleHealthResponse> The health overview of a specific detection rule in the current Kibana space
   *
   * @throws An error if response is not OK
   */
  fetchRuleHealth(
    params: GetRuleHealthRequestBody,
    signal?: AbortSignal
  ): Promise<GetRuleHealthResponse>;
}

export interface RuleMonitoringApiCallArgs {
  /**
   * Optional signal for cancelling the request.
   */
  signal?: AbortSignal;
}

export interface ReadRuleExecutionResultsRequestArgs {
  /**
   * Saved Object ID of the rule.
   */
  ruleId: string;

  /**
   * Filtering criteria.
   */
  filter?: {
    outcome?: UnifiedExecutionStatus[];
    run_type?: RuleRunType[];
    from: string;
    to: string;
  };

  /**
   * Sorting configuration.
   */
  sort?: {
    field?: UnifiedExecutionResultSortField;
    order?: SortOrder;
  };

  /**
   * 1-based page number.
   */
  page?: number;

  /**
   * Number of results per page.
   */
  perPage?: number;
}

export interface ReadRuleExecutionResultsArgs extends ReadRuleExecutionResultsRequestArgs {
  signal?: AbortSignal;
}
