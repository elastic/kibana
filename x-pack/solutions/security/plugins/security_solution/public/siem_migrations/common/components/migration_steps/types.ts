/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SiemMigrationResourceData,
  SiemMigrationResourceBase,
} from '../../../../../common/siem_migrations/model/common.gen';
import type { DashboardMigrationStats } from '../../../dashboards/types';
import type { RuleMigrationStats } from '../../../rules/types';

export type UploadedLookups = Record<string, string>;
export type AddUploadedLookups = (lookups: SiemMigrationResourceData[]) => void;

export type OnMigrationCreated = (
  migrationStats: DashboardMigrationStats | RuleMigrationStats
) => void;
export type OnResourcesCreated = () => void;
export type OnMissingResourcesFetched = (missingResources: SiemMigrationResourceBase[]) => void;
