/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateAttackDiscoveryScheduleResponse,
  DeleteAttackDiscoveryScheduleResponse,
  DisableAttackDiscoveryScheduleResponse,
  EnableAttackDiscoveryScheduleResponse,
  FindAttackDiscoverySchedulesResponse,
  GetAttackDiscoveryScheduleResponse,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
  UpdateAttackDiscoveryScheduleResponse,
} from '@kbn/discoveries-schemas';

import { KibanaServices } from '../../../../../common/lib/kibana';

const INTERNAL_API_VERSION = '1';

export const INTERNAL_SCHEDULES = '/internal/attack_discovery/schedules' as const;
export const INTERNAL_SCHEDULES_BY_ID = '/internal/attack_discovery/schedules/{id}' as const;
export const INTERNAL_SCHEDULES_FIND = '/internal/attack_discovery/schedules/_find' as const;
export const INTERNAL_SCHEDULES_ENABLE =
  '/internal/attack_discovery/schedules/{id}/_enable' as const;
export const INTERNAL_SCHEDULES_DISABLE =
  '/internal/attack_discovery/schedules/{id}/_disable' as const;

const replaceId = (template: string, id: string): string => template.replace('{id}', id);

export interface CreateWorkflowScheduleParams {
  body: AttackDiscoveryScheduleCreateProps;
  signal?: AbortSignal;
}

export const createWorkflowSchedule = async ({
  body,
  signal,
}: CreateWorkflowScheduleParams): Promise<CreateAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.post<CreateAttackDiscoveryScheduleResponse>(INTERNAL_SCHEDULES, {
    body: JSON.stringify(body),
    version: INTERNAL_API_VERSION,
    signal,
  });
};

export interface GetWorkflowScheduleParams {
  id: string;
  signal?: AbortSignal;
}

export const getWorkflowSchedule = async ({
  id,
  signal,
}: GetWorkflowScheduleParams): Promise<GetAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.get<GetAttackDiscoveryScheduleResponse>(
    replaceId(INTERNAL_SCHEDULES_BY_ID, id),
    {
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};

export interface UpdateWorkflowScheduleParams {
  id: string;
  body: AttackDiscoveryScheduleUpdateProps;
  signal?: AbortSignal;
}

export const updateWorkflowSchedule = async ({
  body,
  id,
  signal,
}: UpdateWorkflowScheduleParams): Promise<UpdateAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.put<UpdateAttackDiscoveryScheduleResponse>(
    replaceId(INTERNAL_SCHEDULES_BY_ID, id),
    {
      body: JSON.stringify(body),
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};

export interface DeleteWorkflowScheduleParams {
  id: string;
  signal?: AbortSignal;
}

export const deleteWorkflowSchedule = async ({
  id,
  signal,
}: DeleteWorkflowScheduleParams): Promise<DeleteAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.delete<DeleteAttackDiscoveryScheduleResponse>(
    replaceId(INTERNAL_SCHEDULES_BY_ID, id),
    {
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};

export interface EnableWorkflowScheduleParams {
  id: string;
  signal?: AbortSignal;
}

export const enableWorkflowSchedule = async ({
  id,
  signal,
}: EnableWorkflowScheduleParams): Promise<EnableAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.post<EnableAttackDiscoveryScheduleResponse>(
    replaceId(INTERNAL_SCHEDULES_ENABLE, id),
    {
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};

export interface DisableWorkflowScheduleParams {
  id: string;
  signal?: AbortSignal;
}

export const disableWorkflowSchedule = async ({
  id,
  signal,
}: DisableWorkflowScheduleParams): Promise<DisableAttackDiscoveryScheduleResponse> => {
  return KibanaServices.get().http.post<DisableAttackDiscoveryScheduleResponse>(
    replaceId(INTERNAL_SCHEDULES_DISABLE, id),
    {
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};

export interface FindWorkflowSchedulesParams {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  signal?: AbortSignal;
}

export const findWorkflowSchedules = async ({
  page,
  perPage,
  signal,
  sortDirection,
  sortField,
}: FindWorkflowSchedulesParams): Promise<FindAttackDiscoverySchedulesResponse> => {
  const query = {
    page,
    per_page: perPage,
    sort_direction: sortDirection,
    sort_field: sortField,
  };

  return KibanaServices.get().http.get<FindAttackDiscoverySchedulesResponse>(
    INTERNAL_SCHEDULES_FIND,
    {
      query,
      version: INTERNAL_API_VERSION,
      signal,
    }
  );
};
