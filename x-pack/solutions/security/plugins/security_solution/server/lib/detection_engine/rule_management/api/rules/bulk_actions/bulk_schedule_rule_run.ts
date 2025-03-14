/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationError, RulesClient } from '@kbn/alerting-plugin/server';
import type { ScheduleBackfillParams } from '@kbn/alerting-plugin/server/application/backfill/methods/schedule/types';
import type { BulkManualRuleRun } from '../../../../../../../common/api/detection_engine';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleAlertType } from '../../../../rule_schema';
import { validateBulkScheduleBackfill } from '../../../logic/bulk_actions/validations';

interface BulkScheduleBackfillArgs {
  rules: RuleAlertType[];
  isDryRun?: boolean;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  runPayload: BulkManualRuleRun['run'];
}

interface BulkScheduleBackfillOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
}

export const bulkScheduleBackfill = async ({
  rules,
  isDryRun,
  rulesClient,
  mlAuthz,
  runPayload,
}: BulkScheduleBackfillArgs): Promise<BulkScheduleBackfillOutcome> => {
  const errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError> = [];

  // In the first step, we validate if it is possible to schedule backfill for the rules
  const validatedRules: RuleAlertType[] = [];
  await Promise.all(
    rules.map(async (rule) => {
      try {
        await validateBulkScheduleBackfill({
          mlAuthz,
          rule,
        });
        validatedRules.push(rule);
      } catch (error) {
        errors.push({ item: rule, error });
      }
    })
  );

  if (isDryRun || validatedRules.length === 0) {
    return {
      backfilled: validatedRules,
      errors,
    };
  }

  // Then if it's not a dry run, we schedule backfill for the rules that passed the validation
  const params: ScheduleBackfillParams = validatedRules.map(({ id }) => ({
    ruleId: id,
    start: runPayload.start_date,
    end: runPayload.end_date,
  }));

  // Perform actual schedule using the rulesClient
  const results = await rulesClient.scheduleBackfill(params);
  return results.reduce(
    (acc, backfillResult) => {
      if ('error' in backfillResult) {
        const ruleName = validatedRules.find(
          (rule) => rule.id === backfillResult.error.rule.id
        )?.name;
        const backfillError = backfillResult.error;
        const backfillRule = backfillError.rule;
        const error = {
          message: backfillError.message,
          status: backfillError.status,
          rule: { id: backfillRule.id, name: backfillRule.name ?? ruleName ?? '' },
        };
        acc.errors.push(error);
      } else {
        const backfillRule = validatedRules.find((rule) => rule.id === backfillResult.rule.id);
        if (backfillRule) {
          acc.backfilled.push(backfillRule);
        }
      }
      return acc;
    },
    { backfilled: [], errors } as {
      backfilled: RuleAlertType[];
      errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
    }
  );
};
