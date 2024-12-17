/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleMigrationResourceData,
  RuleMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';

export type OnMigrationCreated = (migrationStats: RuleMigrationTaskStats) => void;
export type OnResourcesCreated = () => void;
export type OnMissingResourcesFetched = (missingResources: RuleMigrationResourceData[]) => void;

export enum DataInputStep {
  Rules = 1,
  Macros = 2,
  Lookups = 3,
  End = 10,
}
