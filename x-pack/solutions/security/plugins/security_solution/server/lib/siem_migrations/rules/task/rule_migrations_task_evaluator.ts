/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distance } from 'fastest-levenshtein';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import type { MigrateRuleState } from './agent/types';
import type { CustomEvaluator } from '../../common/task/siem_migrations_task_evaluator';
import { SiemMigrationTaskEvaluable } from '../../common/task/siem_migrations_task_evaluator';

export class RuleMigrationTaskEvaluator extends SiemMigrationTaskEvaluable(
  RuleMigrationTaskRunner
) {
  protected readonly evaluators: Record<string, CustomEvaluator> = {
    custom_query_accuracy: ({ run, example }) => {
      const runQuery = (run?.outputs as MigrateRuleState)?.elastic_rule?.query;
      const expectedQuery = (example?.outputs as MigrateRuleState)?.elastic_rule?.query;

      if (!expectedQuery) {
        if (runQuery) {
          return { score: 0, comment: 'No custom translation expected, but received' };
        }
        return { comment: 'No custom translation expected' };
      }
      if (!runQuery) {
        return { score: 0, comment: 'Custom translation expected, but not received' };
      }

      // calculate the levenshtein distance between the two queries:
      // The distance is the minimum number of single-character edits required to change one word into the other.
      // So, the distance is a number between 0 and the length of the longest string.
      const queryDistance = distance(runQuery, expectedQuery);
      const maxDistance = Math.max(expectedQuery.length, runQuery.length);
      // The similarity is a number between 0 and 1 (score), where 1 means the two strings are identical.
      const similarity = 1 - queryDistance / maxDistance;

      return {
        score: Math.round(similarity * 1000) / 1000, // round to 3 decimal places
        comment: `Distance: ${queryDistance}`,
      };
    },

    prebuilt_rule_match: ({ run, example }) => {
      const runPrebuiltRuleId = (run?.outputs as MigrateRuleState)?.elastic_rule?.prebuilt_rule_id;
      const expectedPrebuiltRuleId = (example?.outputs as MigrateRuleState)?.elastic_rule
        ?.prebuilt_rule_id;

      if (!expectedPrebuiltRuleId) {
        if (runPrebuiltRuleId) {
          return { score: false, comment: 'No prebuilt rule expected, but received' };
        }
        return { comment: 'No prebuilt rule expected' };
      }
      if (!runPrebuiltRuleId) {
        return { score: false, comment: 'Prebuilt rule expected, but not received' };
      }

      if (runPrebuiltRuleId === expectedPrebuiltRuleId) {
        return { score: true, comment: 'Correct match' };
      }
      return {
        score: false,
        comment: `Incorrect match, expected ID is "${expectedPrebuiltRuleId}" but got "${runPrebuiltRuleId}"`,
      };
    },
  };
}
