/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationSource, OnMissingResourcesFetched } from '../../../common/types';
import type { RuleMigrationStats } from '../../types';

export type OnMigrationCreated = (migrationStats: RuleMigrationStats) => void;
export type OnResourcesCreated = () => void;

export interface RulesDataInputSubStepsProps {
  dataInputStep: number;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
}
