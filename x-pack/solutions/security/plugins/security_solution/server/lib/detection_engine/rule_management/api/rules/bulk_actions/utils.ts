/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResults } from '@kbn/alerting-plugin/server/application/backfill/methods/schedule/types';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';

interface HandleScheduleBackfillResultsParams {
  rules: RuleAlertType[];
  results: ScheduleBackfillResults;
}

interface HandleScheduleBackfillResultsOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
}

export const handleScheduleBackfillResults = ({
  results,
  rules,
}: HandleScheduleBackfillResultsParams): HandleScheduleBackfillResultsOutcome => {
  const errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError> = [];
  return results.reduce(
    (acc, backfillResult) => {
      if ('error' in backfillResult) {
        const ruleName = rules.find((rule) => rule.id === backfillResult.error.rule.id)?.name;
        const backfillError = backfillResult.error;
        const backfillRule = backfillError.rule;
        const error = {
          message: backfillError.message,
          status: backfillError.status,
          rule: { id: backfillRule.id, name: backfillRule.name ?? ruleName ?? '' },
        };
        acc.errors.push(error);
      } else {
        const backfillRule = rules.find((rule) => rule.id === backfillResult.rule.id);
        if (backfillRule) {
          acc.backfilled.push(backfillRule);
        }
      }
      return acc;
    },
    { backfilled: [], errors } as HandleScheduleBackfillResultsOutcome
  );
};
