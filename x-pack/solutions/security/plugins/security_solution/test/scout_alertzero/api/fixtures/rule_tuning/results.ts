/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import type { FindExceptionListItemsResponse } from '@kbn/securitysolution-exceptions-common/api';
import {
  createDetectionsApi,
  createExceptionsApi,
  type DetectionsApi,
} from '@kbn/security-solution-test-api-clients/scout';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { expectStatus, findStepOutputObject, type RuleTuningSpaceArgs } from './common';
import { FP_ALERT_COUNT } from './seed';

/** What the review's backtest counted, from its `record_preview_outcome` step. */
export interface BacktestOutcome {
  current_succeeded: boolean;
  current_alert_count: number;
  proposed_succeeded: boolean;
  proposed_alert_count: number;
}

/** The rule as the detection engine returns it. The tests only seed query rules. */
export type RuleState = Extract<
  Awaited<ReturnType<DetectionsApi['readRule']>>['body'],
  { type: 'query' }
>;

/** The backtest counts of the review, or undefined when its output has another shape. */
export const readBacktest = (review: WorkflowExecutionDto): BacktestOutcome | undefined => {
  // The step runs on every review. Without a backtest it reports both runs as not succeeded.
  const output = findStepOutputObject(review, 'record_preview_outcome');
  if (!output) {
    return undefined;
  }
  const currentSucceeded = output.current_succeeded;
  const currentAlertCount = output.current_alert_count;
  const proposedSucceeded = output.proposed_succeeded;
  const proposedAlertCount = output.proposed_alert_count;
  if (
    typeof currentSucceeded !== 'boolean' ||
    typeof currentAlertCount !== 'number' ||
    typeof proposedSucceeded !== 'boolean' ||
    typeof proposedAlertCount !== 'number'
  ) {
    return undefined;
  }
  return {
    current_succeeded: currentSucceeded,
    current_alert_count: currentAlertCount,
    proposed_succeeded: proposedSucceeded,
    proposed_alert_count: proposedAlertCount,
  };
};

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
  const { body } = response;
  if (body.type !== 'query') {
    throw new Error(`Rule ${id} is a ${body.type} rule, the tests seed query rules`);
  }
  return body;
};

/** The items of the rule's own exception list, or none when it has no such list. */
export const readRuleExceptionItems = async ({
  apiClient,
  headers,
  spaceId,
  rule,
}: RuleTuningSpaceArgs & {
  rule: RuleState;
}): Promise<FindExceptionListItemsResponse['data']> => {
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
  return response.body.data;
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
