/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import {
  SIEM_WORKFLOW_MIGRATION_PATH,
  SIEM_WORKFLOW_MIGRATION_START_PATH,
  SIEM_WORKFLOW_MIGRATION_STATS_PATH,
  SIEM_WORKFLOW_MIGRATION_STOP_PATH,
  SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
  SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
  SIEM_WORKFLOW_MIGRATIONS_PATH,
} from '../../../../common/siem_migrations/workflows/constants';
import type {
  CreateWorkflowMigrationRequestBody,
  CreateWorkflowMigrationResponse,
  CreateWorkflowMigrationWorkflowsRequestBody,
  StartWorkflowMigrationRequestBody,
  StartWorkflowMigrationResponse,
  StopWorkflowMigrationResponse,
  UpdateWorkflowMigrationRequestBody,
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from '../../../../common/siem_migrations/workflows/types';
import { KibanaServices } from '../../../common/lib/kibana';
import type { WorkflowMigrationStats } from '../types';

interface GetWorkflowMigrationParams {
  migrationId: string;
}

type WithSignal<T = undefined> = T & { signal?: AbortSignal };

interface Body<T extends object> {
  body: T;
}

const VERSION = '1';

export const createWorkflowMigration = async ({
  signal,
  name,
}: WithSignal<CreateWorkflowMigrationRequestBody>): Promise<CreateWorkflowMigrationResponse> => {
  return KibanaServices.get().http.put<CreateWorkflowMigrationResponse>(
    SIEM_WORKFLOW_MIGRATIONS_PATH,
    {
      version: VERSION,
      signal,
      body: JSON.stringify({ name }),
    }
  );
};

export const getWorkflowMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetWorkflowMigrationParams>): Promise<WorkflowMigration> => {
  return KibanaServices.get().http.get<WorkflowMigration>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export const getWorkflowMigrationStats = async ({
  migrationId,
  signal,
}: WithSignal<GetWorkflowMigrationParams>): Promise<WorkflowMigrationStats> => {
  return KibanaServices.get().http.get<WorkflowMigrationStats>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_STATS_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export const updateWorkflowMigration = async ({
  migrationId,
  body,
  signal,
}: WithSignal<GetWorkflowMigrationParams> & Body<UpdateWorkflowMigrationRequestBody>) => {
  return KibanaServices.get().http.patch<void>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
      body: JSON.stringify(body),
    }
  );
};

export const deleteWorkflowMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetWorkflowMigrationParams>) => {
  return KibanaServices.get().http.delete<void>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, { migration_id: migrationId }),
    { version: VERSION, signal }
  );
};

export interface GetMigrationWorkflowsParams {
  migrationId: string;
  page?: number;
  perPage?: number;
  searchTerm?: string;
  signal?: AbortSignal;
}

export interface GetMigrationWorkflowsResponse {
  total: number;
  data: WorkflowMigrationWorkflow[];
}

export const getMigrationWorkflows = async ({
  migrationId,
  page,
  perPage,
  searchTerm,
  signal,
}: GetMigrationWorkflowsParams): Promise<GetMigrationWorkflowsResponse> => {
  return KibanaServices.get().http.get<GetMigrationWorkflowsResponse>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      query: {
        page,
        per_page: perPage,
        search_term: searchTerm,
      },
      signal,
    }
  );
};

export const addWorkflowsToMigration = async ({
  migrationId,
  body,
  signal,
}: WithSignal<GetWorkflowMigrationParams> &
  Body<CreateWorkflowMigrationWorkflowsRequestBody>) => {
  return KibanaServices.get().http.post<void>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};

export interface StartWorkflowsMigrationParams {
  migrationId: string;
  settings: {
    connectorId: string;
  };
  langSmithOptions?: LangSmithOptions;
  signal?: AbortSignal;
}

export const startWorkflowMigration = async ({
  migrationId,
  signal,
  settings: { connectorId },
  langSmithOptions,
}: WithSignal<StartWorkflowsMigrationParams>) => {
  const body: StartWorkflowMigrationRequestBody = {
    settings: {
      connector_id: connectorId,
    },
    langsmith_options: langSmithOptions,
  };
  return KibanaServices.get().http.post<StartWorkflowMigrationResponse>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_START_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
      body: JSON.stringify(body),
    }
  );
};

export type StopWorkflowMigrationParams = WithSignal<GetWorkflowMigrationParams>;

export const stopWorkflowMigration = async ({
  migrationId,
  signal,
}: WithSignal<GetWorkflowMigrationParams>) => {
  return KibanaServices.get().http.post<StopWorkflowMigrationResponse>(
    replaceParams(SIEM_WORKFLOW_MIGRATION_STOP_PATH, { migration_id: migrationId }),
    {
      version: VERSION,
      signal,
    }
  );
};

export type GetWorkflowMigrationAllStatsParams = WithSignal<{}>;

export const getWorkflowMigrationAllStats = async ({
  signal,
}: GetWorkflowMigrationAllStatsParams): Promise<WorkflowMigrationStats[]> => {
  return KibanaServices.get().http.get<WorkflowMigrationStats[]>(
    SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
    { version: VERSION, signal }
  );
};
