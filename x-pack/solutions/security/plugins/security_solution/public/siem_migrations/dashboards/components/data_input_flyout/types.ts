/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SPLUNK_DASHBOARD_COLUMNS } from './constants';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import type { DashboardMigrationStats } from '../../types';

export type OnMigrationCreated = (migrationStats: DashboardMigrationStats) => void;
export type OnResourcesCreated = () => void;
export type OnMissingResourcesFetched = (missingResources: SiemMigrationResourceBase[]) => void;

export type SplunkDashboardsResult = Partial<{
  preview: boolean;
  result: Record<(typeof SPLUNK_DASHBOARD_COLUMNS)[number], string | undefined>;
}>;
