/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { DashboardMigrationTaskRunner } from './dashboard_migrations_task_runner';
import { SiemMigrationTaskEvaluable } from '../../common/task/siem_migrations_task_evaluator';

type CustomEvaluatorResult = Omit<EvaluationResult, 'key'>;
export type CustomEvaluator = (args: { run: Run; example: Example }) => CustomEvaluatorResult;

export class DashboardMigrationTaskEvaluator extends SiemMigrationTaskEvaluable(
  DashboardMigrationTaskRunner
) {
  protected readonly evaluators: Record<string, CustomEvaluator> = {
    // TODO: Implement custom evaluators for dashboard migrations
  };
}
