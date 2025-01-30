/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';

import type { RuleExecutionSummary } from '../../../../../../common/api/detection_engine/rule_monitoring';
import {
  RuleExecutionStatusEnum,
  ruleExecutionStatusToNumber,
  ruleLastRunOutcomeToExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

import type { RuleParams } from '../../../rule_schema';

export const createRuleExecutionSummary = (
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RuleExecutionSummary | null => {
  if (!rule.monitoring) {
    // In the rule type the monitoring object is optional because in some cases rules client returns a rule without it.
    // For instance, when we call RulesClient.create(). Despite the fact that it's always in the rule saved object,
    // even when it was just created:
    // https://github.com/elastic/kibana/blob/8.9/x-pack/plugins/alerting/server/rules_client/methods/create.ts#L158
    return null;
  }

  // Data that we need to create rule execution summary is stored in two different "last run" objects within a rule.

  // This last run object is internal to Kibana server and is not exposed via any public HTTP API.
  // Alerting Framework keeps it for itself and provides via the RulesClient for solutions.
  const lastRunInternal = rule.monitoring.run.last_run;
  // This last run object is public - it is exposed via the public Alerting HTTP API.
  const lastRunPublic = rule.lastRun;

  if (rule.running) {
    return {
      last_execution: {
        date: lastRunInternal.timestamp,
        status: RuleExecutionStatusEnum.running,
        status_order: ruleExecutionStatusToNumber(RuleExecutionStatusEnum.running),
        message: '',
        metrics: {},
      },
    };
  }

  if (!lastRunPublic) {
    return null;
  }

  const ruleExecutionStatus = ruleLastRunOutcomeToExecutionStatus(lastRunPublic.outcome);

  return {
    last_execution: {
      date: lastRunInternal.timestamp,
      status: ruleExecutionStatus,
      status_order: ruleExecutionStatusToNumber(ruleExecutionStatus),
      message: lastRunPublic.outcomeMsg?.join(' \n') ?? '',
      metrics: {
        total_indexing_duration_ms: lastRunInternal.metrics.total_indexing_duration_ms ?? undefined,
        total_search_duration_ms: lastRunInternal.metrics.total_search_duration_ms ?? undefined,
        execution_gap_duration_s: lastRunInternal.metrics.gap_duration_s ?? undefined,
      },
    },
  };
};
