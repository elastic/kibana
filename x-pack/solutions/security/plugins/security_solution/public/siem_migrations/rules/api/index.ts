/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';

import type { RuleMigrationFilters } from '../../../../common/siem_migrations/types';
import type { UpdateRuleMigrationData } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import { KibanaServices } from '../../../common/lib/kibana';

import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import {
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_STATS_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_PATH,
  SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
  SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationResponse,
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationResponse,
  GetRuleMigrationTranslationStatsResponse,
  InstallMigrationRulesResponse,
  StartRuleMigrationRequestBody,
  GetRuleMigrationStatsResponse,
  GetRuleMigrationResourcesMissingResponse,
  UpsertRuleMigrationResourcesRequestBody,
  UpsertRuleMigrationResourcesResponse,
  GetRuleMigrationPrebuiltRulesResponse,
  UpdateRuleMigrationResponse,
  StartRuleMigrationResponse,
  GetRuleMigrationIntegrationsResponse,
  GetRuleMigrationPrivilegesResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

export interface GetRuleMigrationStatsParams {
  /** `id` of the migration to get stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for all the existing migrations, aggregated by `migration_id`. */
export const getRuleMigrationStats = async ({
  migrationId,
  signal,
}: GetRuleMigrationStatsParams): Promise<GetRuleMigrationStatsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationStatsResponse>(
    replaceParams(SIEM_RULE_MIGRATION_STATS_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface GetRuleMigrationsStatsAllParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for all the existing migrations, aggregated by `migration_id`. */
export const getRuleMigrationsStatsAll = async ({
  signal,
}: GetRuleMigrationsStatsAllParams = {}): Promise<GetAllStatsRuleMigrationResponse> => {
  return KibanaServices.get().http.get<GetAllStatsRuleMigrationResponse>(
    SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
    { version: '1', signal }
  );
};

export interface CreateRuleMigrationParams {
  /** Optional `id` of migration to add the rules to.
   * The id is necessary only for batching the migration creation in multiple requests */
  migrationId?: string;
  /** The body containing the `connectorId` to use for the migration */
  body: CreateRuleMigrationRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Starts a new migration with the provided rules. */
export const createRuleMigration = async ({
  migrationId,
  body,
  signal,
}: CreateRuleMigrationParams): Promise<CreateRuleMigrationResponse> => {
  return KibanaServices.get().http.post<CreateRuleMigrationResponse>(
    `${SIEM_RULE_MIGRATIONS_PATH}${migrationId ? `/${migrationId}` : ''}`,
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface GetRuleMigrationMissingResourcesParams {
  /** `id` of the migration to get missing resources for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all missing resources of a specific migration. */
export const getMissingResources = async ({
  migrationId,
  signal,
}: GetRuleMigrationMissingResourcesParams): Promise<GetRuleMigrationResourcesMissingResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationResourcesMissingResponse>(
    replaceParams(SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface UpsertResourcesParams {
  /** Optional `id` of migration to add the resources to. */
  migrationId: string;
  /** The body containing the `connectorId` to use for the migration */
  body: UpsertRuleMigrationResourcesRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Updates or creates resources for a specific migration. */
export const upsertMigrationResources = async ({
  migrationId,
  body,
  signal,
}: UpsertResourcesParams): Promise<UpsertRuleMigrationResourcesResponse> => {
  return KibanaServices.get().http.post<UpsertRuleMigrationResourcesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_RESOURCES_PATH, { migration_id: migrationId }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface StartRuleMigrationParams {
  /** `id` of the migration to start */
  migrationId: string;
  /** The connector id to use for the migration */
  connectorId: string;
  /** Optional indicator to retry the migration with specific filtering criteria */
  retry?: SiemMigrationRetryFilter;
  /** Optional LangSmithOptions to use for the for the migration */
  langSmithOptions?: LangSmithOptions;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Starts a new migration with the provided rules. */
export const startRuleMigration = async ({
  migrationId,
  connectorId,
  retry,
  langSmithOptions,
  signal,
}: StartRuleMigrationParams): Promise<StartRuleMigrationResponse> => {
  const body: StartRuleMigrationRequestBody = {
    connector_id: connectorId,
    retry,
    langsmith_options: langSmithOptions,
  };
  return KibanaServices.get().http.put<StartRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_START_PATH, { migration_id: migrationId }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface GetRuleMigrationParams {
  /** `id` of the migration to get rules documents for */
  migrationId: string;
  /** Optional page number to retrieve */
  page?: number;
  /** Optional number of documents per page to retrieve */
  perPage?: number;
  /** Optional field of the rule migration object to sort results by */
  sortField?: string;
  /** Optional direction to sort results by */
  sortDirection?: 'asc' | 'desc';
  /** Optional parameter to filter documents */
  filters?: RuleMigrationFilters;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all the migration rule documents of a specific migration. */
export const getRuleMigrations = async ({
  migrationId,
  page,
  perPage,
  sortField,
  sortDirection,
  filters,
  signal,
}: GetRuleMigrationParams): Promise<GetRuleMigrationResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    {
      version: '1',
      query: {
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_direction: sortDirection,
        search_term: filters?.searchTerm,
        ids: filters?.ids,
        is_prebuilt: filters?.prebuilt,
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

export interface GetRuleMigrationMissingPrivilegesParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all the migration rule documents of a specific migration. */
export const getRuleMigrationMissingPrivileges = async ({
  signal,
}: GetRuleMigrationMissingPrivilegesParams): Promise<GetRuleMigrationPrivilegesResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationPrivilegesResponse>(
    SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH,
    { version: '1', signal }
  );
};

export interface GetRuleMigrationTranslationStatsParams {
  /** `id` of the migration to get translation stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/**
 * Retrieves the translation stats for the migration.
 */
export const getRuleMigrationTranslationStats = async ({
  migrationId,
  signal,
}: GetRuleMigrationTranslationStatsParams): Promise<GetRuleMigrationTranslationStatsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationTranslationStatsResponse>(
    replaceParams(SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface InstallRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** The rule ids to install */
  ids?: string[];
  /** Optional indicator to enable the installed rule */
  enabled?: boolean;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Installs the provided rule ids for a specific migration. */
export const installMigrationRules = async ({
  migrationId,
  ids,
  enabled,
  signal,
}: InstallRulesParams): Promise<InstallMigrationRulesResponse> => {
  return KibanaServices.get().http.post<InstallMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_INSTALL_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify({ ids, enabled }), signal }
  );
};

export interface GetRuleMigrationsPrebuiltRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves all prebuilt rules matched within a specific migration. */
export const getRuleMigrationsPrebuiltRules = async ({
  migrationId,
  signal,
}: GetRuleMigrationsPrebuiltRulesParams): Promise<GetRuleMigrationPrebuiltRulesResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationPrebuiltRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface GetIntegrationsParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves existing integrations. */
export const getIntegrations = async ({
  signal,
}: GetIntegrationsParams): Promise<GetRuleMigrationIntegrationsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationIntegrationsResponse>(
    SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
    { version: '1', signal }
  );
};

export interface UpdateRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** The list of migration rules data to update */
  rulesToUpdate: UpdateRuleMigrationData[];
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Updates provided migration rules. */
export const updateMigrationRules = async ({
  migrationId,
  rulesToUpdate,
  signal,
}: UpdateRulesParams): Promise<UpdateRuleMigrationResponse> => {
  return KibanaServices.get().http.put<UpdateRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify(rulesToUpdate), signal }
  );
};
