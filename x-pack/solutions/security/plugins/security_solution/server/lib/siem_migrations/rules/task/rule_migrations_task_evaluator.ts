/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import { evaluate } from 'langsmith/evaluation';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { Client, type Example } from 'langsmith';
import type { LangSmithEvaluationSettings } from '../../../../../common/siem_migrations/model/common.gen';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';

export interface EvaluateParams {
  connectorId: string;
  langsmithSettings: LangSmithEvaluationSettings;
  invocationConfig?: RunnableConfig;
}

export class RuleMigrationTaskEvaluator extends RuleMigrationTaskRunner {
  public async evaluate({ connectorId, langsmithSettings, invocationConfig = {} }: EvaluateParams) {
    if (!isLangSmithEnabled()) {
      throw Error('LangSmith is not enabled');
    }

    const client = new Client({ apiKey: langsmithSettings.api_key });

    // Make sure the dataset exists
    const dataset: Example[] = [];
    for await (const example of client.listExamples({ datasetName: langsmithSettings.dataset })) {
      dataset.push(example);
    }
    if (dataset.length === 0) {
      throw Error(`LangSmith dataset not found: ${langsmithSettings.dataset}`);
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

    evaluate(migrateRuleTask, {
      data: langsmithSettings.dataset,
      evaluators: [], // auto-evaluators managed in LangSmith for now
      experimentPrefix: connector.name,
      client,
      // prevent rate limiting and unexpected multiple experiment runs
      maxConcurrency: 3,
    })
      .then(() => {
        this.logger.info('Evaluation finished');
      })
      .catch((err) => {
        this.logger.error(`Evaluation error:\n ${JSON.stringify(err, null, 2)}`);
      });
  }
}
