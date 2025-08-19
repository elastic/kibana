/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { identity, keyBy } from 'lodash';
import type { RulesClient, BulkOperationError } from '@kbn/alerting-plugin/server';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { BulkManualRuleFillGaps } from '../../../../../../../common/api/detection_engine';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import { validateBulkRuleGapFilling } from '../../../logic/bulk_actions/validations';

interface BuildScheduleRuleGapFillingParams {
  rules: RuleAlertType[];
  isDryRun?: boolean;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  fillGapsPayload: BulkManualRuleFillGaps['fill_gaps'];
}

interface BulkScheduleBackfillOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
  skipped: Array<Pick<RuleAlertType, 'id' | 'name'>>;
}

export const bulkScheduleRuleGapFilling = async ({
  rules,
  isDryRun,
  rulesClient,
  mlAuthz,
  fillGapsPayload,
}: BuildScheduleRuleGapFillingParams): Promise<BulkScheduleBackfillOutcome> => {
  const errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError> = [];
  // In the first step, we validate if it is possible to schedule backfill for the rules
  const validationResults = await Promise.all(
    rules.map(async (rule) => {
      try {
        await validateBulkRuleGapFilling({
          mlAuthz,
          rule,
        });
        return { valid: true, rule };
      } catch (error) {
        return { valid: false, rule, error };
      }
    })
  );

  const validatedRules = validationResults.filter(({ valid }) => valid).map(({ rule }) => rule);
  errors.push(
    ...validationResults
      .filter(({ valid }) => !valid)
      .map(({ rule, error }) => ({ item: rule, error }))
  );

  if (isDryRun || validatedRules.length === 0) {
    return {
      backfilled: validatedRules,
      errors,
      skipped: [],
    };
  }
  const { start_date: start, end_date: end } = fillGapsPayload;

  // Due to performance considerations we will backfill a maximum of 1000 gaps per rule when called with many rules
  // however, this endpoint will be called with one rule as well. In that case, we will increase the limit to 10_000
  // in order to attempt to fill all the gaps of the rule in the specified time range
  const maxGapCountPerRule = rules.length === 1 ? 10_000 : 1000;

  const { backfilled, skipped, errored } = await rulesClient.bulkFillGapsByRuleIds(
    {
      rules: validatedRules.map(({ id, name, consumer, alertTypeId }) => ({
        id,
        name,
        consumer,
        alertTypeId,
      })),
      range: {
        start,
        end,
      },
    },
    {
      maxGapCountPerRule,
    }
  );

  errored.forEach((backfillingError) => {
    errors.push({
      rule: backfillingError.rule,
      message: `${backfillingError.step} - ${backfillingError.errorMessage}`,
    });
  });

  const rulesDict = keyBy(validatedRules, 'id');

  return {
    backfilled: backfilled.map(({ id }) => rulesDict[id]).filter(identity),
    errors,
    skipped,
  };
};
