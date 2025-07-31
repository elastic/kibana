/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { evaluate } from 'langsmith/evaluation';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { Client } from 'langsmith';
import { distance } from 'fastest-levenshtein';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import type { MigrateRuleGraphConfig, MigrateRuleState } from './agent/types';

export interface EvaluateParams {
  connectorId: string;
  langsmithOptions: LangSmithEvaluationOptions;
  invocationConfig?: MigrateRuleGraphConfig;
}

export type Evaluator = (args: { run: Run; example: Example }) => EvaluationResult;
type CustomEvaluatorResult = Omit<EvaluationResult, 'key'>;
export type CustomEvaluator = (args: { run: Run; example: Example }) => CustomEvaluatorResult;

export class RuleMigrationTaskEvaluator extends RuleMigrationTaskRunner {
  public async evaluate({ connectorId, langsmithOptions, invocationConfig }: EvaluateParams) {
    if (!isLangSmithEnabled()) {
      throw Error('LangSmith is not enabled');
    }

    const client = new Client({ apiKey: langsmithOptions.api_key });

    // Make sure the dataset exists
    const dataset: Example[] = [];
    for await (const example of client.listExamples({ datasetName: langsmithOptions.dataset })) {
      dataset.push(example);
    }
    if (dataset.length === 0) {
      throw Error(`LangSmith dataset not found: ${langsmithOptions.dataset}`);
    }

    // Initialize the the task runner first, this may take some time
    await this.initialize();

    // Check if the connector exists and user has privileges to read it
    const connector = await this.dependencies.actionsClient.get({ id: connectorId });
    if (!connector) {
      throw Error(`Connector with id ${connectorId} not found`);
    }

    // for each connector, setup the evaluator
    await this.setup(connectorId);

    // create the migration task after setup
    const migrateRuleTask = this.createMigrateRuleTask(invocationConfig);
    const evaluators = this.getEvaluators();

    evaluate(migrateRuleTask, {
      data: langsmithOptions.dataset,
      experimentPrefix: connector.name,
      evaluators,
      client,
      maxConcurrency: 3,
    })
      .then(() => {
        this.logger.info('Evaluation finished');
      })
      .catch((err) => {
        this.logger.error(`Evaluation error:\n ${JSON.stringify(err, null, 2)}`);
      });
  }

  private getEvaluators(): Evaluator[] {
    return Object.entries(this.evaluators).map(([key, evaluator]) => {
      return (args) => {
        const result = evaluator(args);
        return { key, ...result };
      };
    });
  }

  /**
   * This is a map of custom evaluators that are used to evaluate rule migration tasks
   * The object keys are used for the `key` property of the evaluation result, and the value is a function that takes a the `run` and `example`
   * and returns a `score` and a `comment` (and any other data needed for the evaluation)
   **/
  private readonly evaluators: Record<string, CustomEvaluator> = {
    translation_result: ({ run, example }) => {
      const runResult = (run?.outputs as MigrateRuleState)?.translation_result;
      const expectedResult = (example?.outputs as MigrateRuleState)?.translation_result;

      if (!expectedResult) {
        return { comment: 'No translation result expected' };
      }
      if (!runResult) {
        return { score: false, comment: 'No translation result received' };
      }

      if (runResult === expectedResult) {
        return { score: true, comment: 'Correct' };
      }

      return {
        score: false,
        comment: `Incorrect, expected "${expectedResult}" but got "${runResult}"`,
      };
    },

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
