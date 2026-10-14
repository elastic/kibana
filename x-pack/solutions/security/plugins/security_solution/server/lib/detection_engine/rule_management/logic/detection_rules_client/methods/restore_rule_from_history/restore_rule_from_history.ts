/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-types';
import type { RuleParams } from '../../../../../rule_schema';
import { convertAlertingRuleToRuleResponse } from '../../converters/convert_alerting_rule_to_rule_response';
import type { RestoreRuleFromHistoryParams, RestoreRuleFromHistoryResult } from './types';
import { fetchRuleWithHistory } from './fetch_rule_with_history';
import { checkConcurrency } from './check_concurrency';
import { restoreDeletedRule } from './restore_deleted_rule';
import { restoreRuleState } from './restore_rule_state';

export async function restoreRuleFromHistory(
  params: RestoreRuleFromHistoryParams
): Promise<RestoreRuleFromHistoryResult> {
  const { rulesClient, ruleId, changeId, currentRuleRevision } = params;

  const { existingRule, historyItem } = await fetchRuleWithHistory({
    rulesClient,
    ruleId,
    changeId,
  });

  checkConcurrency({
    existingRule,
    currentRuleRevision,
  });

  if (!historyItem.rule) {
    throw new Error(`Snapshot for changeId: "${changeId}" could not be hydrated`);
  }

  const snapshotRule = convertAlertingRuleToRuleResponse(
    historyItem.rule as SanitizedRule<RuleParams>
  );
  const restoredRevisionTimestamp = historyItem['@timestamp'];

  if (existingRule == null) {
    return restoreDeletedRule({
      ...params,
      snapshotRule,
      restoredRevisionTimestamp,
    });
  }

  return restoreRuleState({
    ...params,
    existingRule,
    snapshotRule,
    restoredRevisionTimestamp,
  });
}
