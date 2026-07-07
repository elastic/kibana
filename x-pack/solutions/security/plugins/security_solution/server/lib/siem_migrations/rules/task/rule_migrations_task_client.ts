/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  RuleMigration,
  RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type {
  RuleMigrationTaskInput,
  RuleMigrationTaskOutput,
} from './rule_migrations_task_runner';
import { RuleMigrationTaskRunner } from './rule_migrations_task_runner';
import { SiemMigrationsTaskClient } from '../../common/task/siem_migrations_task_client';
import type { MigrateRuleConfigSchema } from './agent/types';
import { RuleMigrationTaskEvaluator } from './rule_migrations_task_evaluator';

export type RuleMigrationsRunning = Map<string, RuleMigrationTaskRunner>;

export class RuleMigrationsTaskClient extends SiemMigrationsTaskClient<
  RuleMigration,
  RuleMigrationRule,
  RuleMigrationTaskInput,
  MigrateRuleConfigSchema,
  RuleMigrationTaskOutput
> {
  protected readonly TaskRunnerClass = RuleMigrationTaskRunner;
  protected readonly EvaluatorClass = RuleMigrationTaskEvaluator;

  // Rules specific last_execution config
  protected getLastExecutionConfig(
    invocationConfig: RunnableConfig<MigrateRuleConfigSchema>
  ): Record<string, unknown> {
    return {
      skipPrebuiltRulesMatching: invocationConfig.configurable?.skipPrebuiltRulesMatching ?? false,
    };
  }
}
