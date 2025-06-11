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
import { validateBulkScheduleBackfill } from '../../../logic/bulk_actions/validations';

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
      skipped: [],
    };
  }
  const { start_date: start, end_date: end } = fillGapsPayload;

  const { backfilled, skipped, errored } = await rulesClient.bulkFillGapsByRuleIds({
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
  });

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
