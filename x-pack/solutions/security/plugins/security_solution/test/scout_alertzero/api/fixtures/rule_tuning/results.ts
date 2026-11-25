/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import {
  createDetectionsApi,
  createExceptionsApi,
} from '@kbn/security-solution-test-api-clients/scout';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { findStepOutput } from '../workflow_runs';
import { expectStatus, type RuleTuningSpaceArgs } from './common';
import { FP_ALERT_COUNT } from './seed';

/** What the review's backtest counted, from its `record_preview_outcome` step. */
export interface BacktestOutcome {
  current_succeeded: boolean;
  current_alert_count: number;
  proposed_succeeded: boolean;
  proposed_alert_count: number;
}

/** The backtest result of the review, or undefined when the review never ran one. */
export const readBacktest = (review: WorkflowExecutionDto): BacktestOutcome | undefined =>
  findStepOutput(review, 'record_preview_outcome') as BacktestOutcome | undefined;

export interface RuleState {
  query: string;
  risk_score: number;
  severity: string;
  exceptions_list: Array<{
    list_id: string;
    namespace_type: 'single' | 'agnostic';
    type: string;
  }>;
}

export const readRule = async ({
  apiClient,
  headers,
  spaceId,
  id,
}: RuleTuningSpaceArgs & { id: string }): Promise<RuleState> => {
  const response = await createDetectionsApi(apiClient).readRule(
    { query: { id } },
    { headers, kibanaSpace: spaceId }
  );
  expectStatus(`Read rule ${id}`, response);
  return response.body as RuleState;
};

export interface ExceptionItem {
  name: string;
  entries: Array<{ field: string; operator: string; type: string; value?: string }>;
}

/** The items of the rule's own exception list. A rule with no such list has none. */
export const readRuleExceptionItems = async ({
  apiClient,
  headers,
  spaceId,
  rule,
}: RuleTuningSpaceArgs & { rule: RuleState }): Promise<ExceptionItem[]> => {
  const list = rule.exceptions_list.find(({ type }) => type === 'rule_default');
  if (!list) {
    return [];
  }
  const response = await createExceptionsApi(apiClient).findExceptionListItems(
    {
      query: {
        list_id: [list.list_id],
        namespace_type: [list.namespace_type],
      },
    },
    { headers, kibanaSpace: spaceId }
  );
  expectStatus(`Read the exception items of list ${list.list_id}`, response);
  return response.body.data as ExceptionItem[];
};

/** Workflow tags of the rule's alerts, one array per alert. */
export const readAlertTags = async ({
  esClient,
  spaceId,
  ruleId,
}: {
  esClient: EsClient;
  spaceId: string;
  ruleId: string;
}): Promise<string[][]> => {
  const response = await esClient.search<{ 'kibana.alert.workflow_tags'?: string[] }>({
    index: `.alerts-security.alerts-${spaceId}`,
    size: FP_ALERT_COUNT,
    query: { term: { 'kibana.alert.rule.rule_id': ruleId } },
  });
  return response.hits.hits.map(({ _source }) => _source?.['kibana.alert.workflow_tags'] ?? []);
};
