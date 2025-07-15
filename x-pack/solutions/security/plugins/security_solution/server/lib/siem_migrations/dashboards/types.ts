/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternAdapter } from '@kbn/index-adapter';

export interface DashboardMigrationAdapters {
  migrations: IndexPatternAdapter;
  dashboards: IndexPatternAdapter;
  // resources: IndexPatternAdapter;
  // integrations: IndexAdapter;
  // prebuiltrules: IndexAdapter;
}

export type DashboardMigrationAdapterId = keyof DashboardMigrationAdapters;

export type DashboardMigrationIndexNameProvider = () => Promise<string>;
export type DashboardMigrationIndexNameProviders = Record<
  DashboardMigrationAdapterId,
  DashboardMigrationIndexNameProvider
>;
