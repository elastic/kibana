/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';

import type { UpdateRuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationFilters } from '../../../../common/siem_migrations/types';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import { KibanaServices } from '../../../common/lib/kibana';

import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import {
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_STATS_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_PATH,
  SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
  SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH,
  SIEM_RULE_MIGRATION_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_STOP_PATH,
} from '../../../../common/siem_migrations/constants';
import type {
  CreateRuleMigrationResponse,
  GetRuleMigrationTranslationStatsResponse,
  InstallMigrationRulesResponse,
  StartRuleMigrationRequestBody,
  GetRuleMigrationResourcesMissingResponse,
  UpsertRuleMigrationResourcesRequestBody,
  UpsertRuleMigrationResourcesResponse,
  GetRuleMigrationPrebuiltRulesResponse,
  StartRuleMigrationResponse,
  GetRuleMigrationIntegrationsResponse,
  GetRuleMigrationPrivilegesResponse,
  GetRuleMigrationRulesResponse,
  CreateRuleMigrationRulesRequestBody,
  GetRuleMigrationIntegrationsStatsResponse,
  UpdateRuleMigrationRulesResponse,
  UpdateRuleMigrationRequestBody,
  StopRuleMigrationResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationStats } from '../types';

export interface GetRuleMigrationStatsParams {
  /** `id` of the migration to get stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the stats for the specific migration. */
export const getRuleMigrationStats = async ({
  migrationId,
  signal,
}: GetRuleMigrationStatsParams): Promise<RuleMigrationStats> => {
  // Typed with `RuleMigrationStats` instead of `GetRuleMigrationStatsResponse` to use native enums instead of the zod enum
  return KibanaServices.get().http.get<RuleMigrationStats>(
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
}: GetRuleMigrationsStatsAllParams = {}): Promise<RuleMigrationStats[]> => {
  // Typed with `RuleMigrationStats` instead of `GetAllStatsRuleMigrationResponse` to use native enums instead of the zod enum
  return KibanaServices.get().http.get<RuleMigrationStats[]>(SIEM_RULE_MIGRATIONS_ALL_STATS_PATH, {
    version: '1',
    signal,
  });
};

export interface CreateRuleMigrationParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
  /** The name of the migration */
  name: string;
}
/** Starts a new migration with the provided rules. */
export const createRuleMigration = async ({
  signal,
  name,
}: CreateRuleMigrationParams): Promise<CreateRuleMigrationResponse> => {
  return KibanaServices.get().http.put<CreateRuleMigrationResponse>(SIEM_RULE_MIGRATIONS_PATH, {
    version: '1',
    signal,
    body: JSON.stringify({ name }),
  });
};

export interface AddRulesToMigrationParams {
  /** `id` of the migration to add the rules to */
  migrationId: string;
  /** The body containing the list of rules to be added to the migration */
  body: CreateRuleMigrationRulesRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/** Adds provided rules to an existing migration */
export const addRulesToMigration = async ({
  migrationId,
  body,
  signal,
}: AddRulesToMigrationParams) => {
  return KibanaServices.get().http.post<void>(
    replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId }),
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
  settings: {
    /** The connector id to use for the migration */
    connectorId: string;
    /** Option to toggle prebuilt rules matching */
    skipPrebuiltRulesMatching?: boolean;
  };
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
  retry,
  langSmithOptions,
  signal,
  settings: { connectorId, skipPrebuiltRulesMatching = false },
}: StartRuleMigrationParams): Promise<StartRuleMigrationResponse> => {
  const body: StartRuleMigrationRequestBody = {
    settings: {
      connector_id: connectorId,
      skip_prebuilt_rules_matching: skipPrebuiltRulesMatching,
    },
    retry,
    langsmith_options: langSmithOptions,
  };
  return KibanaServices.get().http.post<StartRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_START_PATH, { migration_id: migrationId }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface StopRuleMigrationParams {
  /** `id` of the migration to stop */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Stops a new migration with the provided rules. */
export const stopRuleMigration = async ({
  migrationId,
  signal,
}: StopRuleMigrationParams): Promise<StopRuleMigrationResponse> => {
  return KibanaServices.get().http.post<StopRuleMigrationResponse>(
    replaceParams(SIEM_RULE_MIGRATION_STOP_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};

export interface GetMigrationRulesParams {
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
export const getMigrationRules = async ({
  migrationId,
  page,
  perPage,
  sortField,
  sortDirection,
  filters,
  signal,
}: GetMigrationRulesParams): Promise<GetRuleMigrationRulesResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId }),
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
}: GetIntegrationsParams = {}): Promise<GetRuleMigrationIntegrationsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationIntegrationsResponse>(
    SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
    { version: '1', signal }
  );
};

export interface GetIntegrationsStatsParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves existing integrations. */
export const getIntegrationsStats = async ({
  signal,
}: GetIntegrationsParams = {}): Promise<GetRuleMigrationIntegrationsStatsResponse> => {
  return KibanaServices.get().http.get<GetRuleMigrationIntegrationsStatsResponse>(
    SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH,
    { version: '1', signal }
  );
};

export interface UpdateRulesParams {
  /** `id` of the migration to install rules for */
  migrationId: string;
  /** The list of migration rules data to update */
  rulesToUpdate: UpdateRuleMigrationRule[];
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Updates provided migration rules. */
export const updateMigrationRules = async ({
  migrationId,
  rulesToUpdate,
  signal,
}: UpdateRulesParams): Promise<UpdateRuleMigrationRulesResponse> => {
  return KibanaServices.get().http.patch<UpdateRuleMigrationRulesResponse>(
    replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify(rulesToUpdate), signal }
  );
};

export interface UpdateMigrationParams {
  /** `id` of the migration to update the name for */
  migrationId: string;
  /** The migration fields to update */
  body: UpdateRuleMigrationRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
export const updateMigration = async ({
  migrationId,
  signal,
  body,
}: UpdateMigrationParams): Promise<void> => {
  return KibanaServices.get().http.patch<void>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    { version: '1', body: JSON.stringify(body), signal }
  );
};

export interface DeleteMigrationParams {
  /** `id` of the migration to delete */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
export const deleteMigration = async ({ migrationId, signal }: DeleteMigrationParams) => {
  return KibanaServices.get().http.delete<unknown>(
    replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }),
    { version: '1', signal }
  );
};
