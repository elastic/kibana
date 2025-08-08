/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import assert from 'assert';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Run, Example } from 'langsmith/schemas';
import { evaluate } from 'langsmith/evaluation';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { Client } from 'langsmith';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationTaskRunner } from './siem_migrations_task_runner';
import type { MigrationDocument, ItemDocument } from '../types';

export interface EvaluateParams<C extends object = {}> {
  connectorId: string;
  langsmithOptions: LangSmithEvaluationOptions;
  invocationConfig?: RunnableConfig<C>;
}

export type Evaluator = (args: { run: Run; example: Example }) => EvaluationResult;
type CustomEvaluatorResult = Omit<EvaluationResult, 'key'>;
export type CustomEvaluator = (args: { run: Run; example: Example }) => CustomEvaluatorResult;

export type SiemMigrationTaskEvaluatorClass<
  M extends MigrationDocument = MigrationDocument,
  I extends ItemDocument = ItemDocument,
  P extends object = {},
  C extends object = {},
  O extends object = {}
> = ReturnType<typeof SiemMigrationTaskEvaluable<M, I, P, C, O>>;

/**
 * Mixin to create a task evaluator based on a concrete implementation of a SiemMigrationTaskRunner.
 * @param TaskRunnerConcreteClass: The concrete class that extends SiemMigrationTaskRunner.
 * @returns the class that extends the TaskRunnerConcreteClass with evaluation capabilities.
 */
export function SiemMigrationTaskEvaluable<
  M extends MigrationDocument = MigrationDocument,
  I extends ItemDocument = ItemDocument,
  P extends object = {}, // The migration task input parameters schema
  C extends object = {}, // The migration task config schema
  O extends object = {} // The migration task output schema
>(TaskRunnerConcreteClass: typeof SiemMigrationTaskRunner<M, I, P, C, O>) {
  return class extends TaskRunnerConcreteClass {
    protected evaluators!: Record<string, CustomEvaluator>;

    public async evaluate({ connectorId, langsmithOptions, invocationConfig }: EvaluateParams<C>) {
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

      // Initialize the task runner first, this may take some time
      await this.initialize();

      // Check if the connector exists and user has privileges to read it
      const connector = await this.dependencies.actionsClient.get({ id: connectorId });
      if (!connector) {
        throw Error(`Connector with id ${connectorId} not found`);
      }

      // for each connector, setup the evaluator
      await this.setup(connectorId);

      // create the migration task after setup
      const migrateItemTask = (params: P) => {
        assert(this.task, 'Task is not defined');
        return this.task(params, invocationConfig);
      };
      const evaluators = this.getEvaluators();

      evaluate(migrateItemTask, {
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

    private genericEvaluators: Record<string, CustomEvaluator> = {
      translation_result: ({ run, example }) => {
        const runResult = (run?.outputs as ItemDocument)?.translation_result;
        const expectedResult = (example?.outputs as ItemDocument)?.translation_result;

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
    };

    private getEvaluators(): Evaluator[] {
      return Object.entries({ ...this.genericEvaluators, ...this.evaluators }).map(
        ([key, evaluator]) => {
          return (args) => {
            const result = evaluator(args);
            return { key, ...result };
          };
        }
      );
    }
  };
}
