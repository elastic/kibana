/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import {
  SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
  SIEM_DASHBOARD_MIGRATION_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH,
  SIEM_DASHBOARD_MIGRATION_START_PATH,
  SIEM_DASHBOARD_MIGRATION_STATS_PATH,
  SIEM_DASHBOARD_MIGRATION_STOP_PATH,
  SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH,
  SIEM_DASHBOARD_MIGRATIONS_PATH,
} from '../../../../common/siem_migrations/dashboards/constants';
import type {
  CreateDashboardMigrationRequestBody,
  GetAllDashboardMigrationsStatsResponse,
  StartDashboardsMigrationRequestBody,
  StopDashboardsMigrationResponse,
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationResponse,
  GetDashboardMigrationResourcesMissingResponse,
  GetDashboardMigrationResourcesResponse,
  GetDashboardMigrationResponse,
  GetDashboardMigrationStatsResponse,
  UpsertDashboardMigrationResourcesRequestBody,
  UpsertDashboardMigrationResourcesResponse,
  StartDashboardsMigrationResponse,
} from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { KibanaServices } from '../../../common/lib/kibana';

interface GetDashboardMigrationParams {
  migrationId: string;
}

type WithSignal<T = undefined> = T & { signal?: AbortSignal };

interface Body<T extends object> {
  body: T;
}

const VERSION = '1';

export const createDashboardMigration = async ({
  signal,
  name,
}: WithSignal<CreateDashboardMigrationRequestBody>): Promise<CreateDashboardMigrationResponse> => {
  return KibanaServices.get().http.post<CreateDashboardMigrationResponse>(
    SIEM_DASHBOARD_MIGRATIONS_PATH,
    {
      version: VERSION,
      signal,
      body: JSON.stringify({ name }),
    }
  );
};

export const getDashboardMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>): Promise<GetDashboardMigrationResponse> => {
  return KibanaServices.get().http.get<GetDashboardMigrationResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export const getDashboardMigrationStats = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>): Promise<GetDashboardMigrationStatsResponse> => {
  return KibanaServices.get().http.get<GetDashboardMigrationStatsResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_STATS_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export const addDashboardsToDashboardMigration = async ({
  migrationId,
  body,
  signal,
}: WithSignal<GetDashboardMigrationParams> &
  Body<CreateDashboardMigrationDashboardsRequestBody>) => {
  return KibanaServices.get().http.post<void>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};

// --- Resources

export const getDashboardMigrationMissingResources = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>) => {
  return KibanaServices.get().http.get<GetDashboardMigrationResourcesMissingResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export const upsertDashboardMigrationResources = async ({
  migrationId,
  body,
  signal,
}: WithSignal<GetDashboardMigrationParams> &
  Body<UpsertDashboardMigrationResourcesRequestBody>) => {
  return KibanaServices.get().http.post<UpsertDashboardMigrationResourcesResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};

export const getDashboardMigrationResources = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>) => {
  return KibanaServices.get().http.get<GetDashboardMigrationResourcesResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

////////////
// / Task
///////////

export interface StartDashboardsMigrationParams {
  /** `id` of the migration to start */
  migrationId: string;
  /** Settings for the migration */
  settings: {
    /** The connector id to use for the migration */
    connectorId: string;
  };
  /** Optional indicator to retry the migration with specific filtering criteria */
  retry?: SiemMigrationRetryFilter;
  /** Optional LangSmithOptions to use for the for the migration */
  langSmithOptions?: LangSmithOptions;
  /** Optional AbortSignal for cancelling request */
}

export const startDashboardMigration = async ({
  migrationId,
  signal,
  settings: { connectorId },
  retry,
  langSmithOptions,
}: WithSignal<StartDashboardsMigrationParams>) => {
  const body: StartDashboardsMigrationRequestBody = {
    settings: {
      connector_id: connectorId,
    },
    langsmith_options: langSmithOptions,
    retry,
  };
  return KibanaServices.get().http.post<StartDashboardsMigrationResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_START_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
      body: JSON.stringify(body),
    }
  );
};

export type StopDashboardMigrationParams = WithSignal<GetDashboardMigrationParams>;

export const stopDashboardMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>) => {
  return KibanaServices.get().http.post<StopDashboardsMigrationResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_STOP_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
    }
  );
};

export type GetDashboardMigrationAllStatsParams = WithSignal<{}>;

export const getDashboardMigrationAllStats = async ({
  signal,
}: GetDashboardMigrationAllStatsParams): Promise<GetAllDashboardMigrationsStatsResponse> => {
  return KibanaServices.get().http.get<GetAllDashboardMigrationsStatsResponse>(
    SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH,
    { version: VERSION, signal }
  );
};
