/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';
import type { SiemMigrationFilters } from '../../../../common/siem_migrations/types';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import {
  SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
  SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
  SIEM_DASHBOARD_MIGRATION_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH,
  SIEM_DASHBOARD_MIGRATION_START_PATH,
  SIEM_DASHBOARD_MIGRATION_STATS_PATH,
  SIEM_DASHBOARD_MIGRATION_STOP_PATH,
  SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH,
  SIEM_DASHBOARD_MIGRATIONS_PATH,
} from '../../../../common/siem_migrations/dashboards/constants';
import type {
  CreateDashboardMigrationRequestBody,
  StartDashboardsMigrationRequestBody,
  StopDashboardsMigrationResponse,
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationResponse,
  GetDashboardMigrationResourcesMissingResponse,
  GetDashboardMigrationResourcesResponse,
  GetDashboardMigrationResponse,
  UpsertDashboardMigrationResourcesRequestBody,
  UpsertDashboardMigrationResourcesResponse,
  StartDashboardsMigrationResponse,
  UpdateDashboardMigrationRequestBody,
  GetDashboardMigrationDashboardsResponse,
  InstallMigrationDashboardsResponse,
  GetAllTranslationStatsDashboardMigrationResponse,
} from '../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { KibanaServices } from '../../../common/lib/kibana';
import type { DashboardMigrationStats } from '../types';

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
  return KibanaServices.get().http.put<CreateDashboardMigrationResponse>(
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
}: WithSignal<GetDashboardMigrationParams>): Promise<DashboardMigrationStats> => {
  // Typed with `DashboardMigrationStats` instead of `GetDashboardMigrationStatsResponse` to use native enums instead of the zod enum
  return KibanaServices.get().http.get<DashboardMigrationStats>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_STATS_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

/**
 * Retrieves the translation stats for the migration.
 */
export const getDashboardMigrationTranslationStats = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>): Promise<GetAllTranslationStatsDashboardMigrationResponse> => {
  return KibanaServices.get().http.get<GetAllTranslationStatsDashboardMigrationResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export const updateDashboardMigration = async ({
  migrationId,
  body,
  signal,
}: WithSignal<GetDashboardMigrationParams> & Body<UpdateDashboardMigrationRequestBody>) => {
  return KibanaServices.get().http.patch<void>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
      body: JSON.stringify(body),
    }
  );
};

export interface GetMigrationDashboardsParams {
  /** `id` of the migration to get dashboards documents for */
  migrationId: string;
  /** Optional page number to retrieve */
  page?: number;
  /** Optional number of documents per page to retrieve */
  perPage?: number;
  /** Optional field of the dashboard migration object to sort results by */
  sortField?: string;
  /** Optional direction to sort results by */
  sortDirection?: 'asc' | 'desc';
  /** Optional parameter to filter documents */
  filters?: SiemMigrationFilters;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all the migration dashboard documents of a specific migration. */
export const getMigrationDashboards = async ({
  migrationId,
  page,
  perPage,
  sortField,
  sortDirection,
  filters,
  signal,
}: GetMigrationDashboardsParams): Promise<GetDashboardMigrationDashboardsResponse> => {
  return KibanaServices.get().http.get<GetDashboardMigrationDashboardsResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, { migration_id: migrationId }),
    {
      version: '1',
      query: {
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_direction: sortDirection,
        search_term: filters?.searchTerm,
        ids: filters?.ids,
        is_installed: filters?.installed,
        is_fully_translated: filters?.fullyTranslated,
        is_partially_translated: filters?.partiallyTranslated,
        is_untranslatable: filters?.untranslatable,
        is_failed: filters?.failed,
      },
      signal,
    }
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

export interface InstallDashboardsParams {
  /** `id` of the migration to install dashboards for */
  migrationId: string;
  /** The dashboard ids to install */
  ids?: string[];
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Installs the provided dashboard ids for a specific migration. */
export const installMigrationDashboards = async ({
  migrationId,
  ids,
  signal,
}: InstallDashboardsParams): Promise<InstallMigrationDashboardsResponse> => {
  return KibanaServices.get().http.post<InstallMigrationDashboardsResponse>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_INSTALL_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify({ ids }), signal }
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
    replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH, { migration_id: migrationId }),
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
}: GetDashboardMigrationAllStatsParams): Promise<DashboardMigrationStats[]> => {
  // Typed with `DashboardMigrationStats` instead of `GetAllDashboardMigrationsStatsResponse` to use native enums instead of the zod enum
  return KibanaServices.get().http.get<DashboardMigrationStats[]>(
    SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH,
    { version: VERSION, signal }
  );
};

export const deleteDashboardMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetDashboardMigrationParams>) => {
  return KibanaServices.get().http.delete<void>(
    replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};
