/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResults } from '@kbn/alerting-plugin/server/application/backfill/methods/schedule/types';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import type { BulkActionError } from './bulk_actions_response';

interface HandleScheduleBackfillResultsParams {
  rules: RuleAlertType[];
  results: ScheduleBackfillResults;
}

interface HandleScheduleBackfillResultsOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
}

export const RULE_NOT_FOUND_MESSAGE = 'Rule not found';

/**
 * Mutates the errors array in place: removes fetch-time "Rule not found" errors
 * and pushes corresponding RULE_NOT_FOUND skip results into the skipped array.
 * Used by the delete action to treat missing rules as skipped (idempotent delete).
 */
export const extractNotFoundAsSkipped = (
  errors: BulkActionError[],
  skipped: BulkActionSkipResult[]
): void => {
  for (let i = errors.length - 1; i >= 0; i--) {
    const err = errors[i];
    if (
      'item' in err &&
      typeof err.item === 'string' &&
      err.error instanceof Error &&
      err.error.message === RULE_NOT_FOUND_MESSAGE
    ) {
      skipped.push({ id: err.item, skip_reason: 'RULE_NOT_FOUND' });
      errors.splice(i, 1);
    }
  }
};

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
