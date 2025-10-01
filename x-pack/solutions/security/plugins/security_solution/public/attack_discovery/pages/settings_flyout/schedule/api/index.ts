/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParams } from '@kbn/openapi-common/shared';

import type { AsApiContract } from '@kbn/actions-types';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import type {
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
  CreateAttackDiscoverySchedulesResponse,
  DeleteAttackDiscoverySchedulesResponse,
  DisableAttackDiscoverySchedulesResponse,
  EnableAttackDiscoverySchedulesResponse,
  FindAttackDiscoverySchedulesResponse,
  GetAttackDiscoverySchedulesResponse,
  UpdateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import {
  transformAttackDiscoveryScheduleCreatePropsToApi,
  transformAttackDiscoveryScheduleUpdatePropsToApi,
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { KibanaServices } from '../../../../../common/lib/kibana';

export const ALERTING_RULE_TYPES_URL = `${BASE_ALERTING_API_PATH}/rule_types` as const;

export interface CreateAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** The body containing the schedule attributes */
  body: AttackDiscoveryScheduleCreateProps;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Creates a new attack discovery schedule with the provided attributes. */
export const createAttackDiscoverySchedule = async ({
  body,
  signal,
  attackDiscoveryPublicApiEnabled,
}: CreateAttackDiscoveryScheduleParams): Promise<CreateAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;

  // Transform body format for public API (snake_case) vs internal API (camelCase)
  const requestBody = attackDiscoveryPublicApiEnabled
    ? transformAttackDiscoveryScheduleCreatePropsToApi(body)
    : body;

  return KibanaServices.get().http.post<CreateAttackDiscoverySchedulesResponse>(route, {
    body: JSON.stringify(requestBody),
    version,
    signal,
  });
};

export interface GetAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the attack discovery schedule. */
export const getAttackDiscoverySchedule = async ({
  id,
  signal,
  attackDiscoveryPublicApiEnabled,
}: GetAttackDiscoveryScheduleParams): Promise<GetAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_BY_ID
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;
  return KibanaServices.get().http.get<GetAttackDiscoverySchedulesResponse>(
    replaceParams(route, { id }),
    {
      version,
      signal,
    }
  );
};

export interface UpdateAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** `id` of the attack discovery schedule */
  id: string;
  /** The body containing the schedule attributes */
  body: AttackDiscoveryScheduleUpdateProps;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Updates the attack discovery schedule. */
export const updateAttackDiscoverySchedule = async ({
  attackDiscoveryPublicApiEnabled,
  id,
  body,
  signal,
}: UpdateAttackDiscoveryScheduleParams): Promise<UpdateAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_BY_ID
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;

  // Transform body format for public API (snake_case) vs internal API (camelCase)
  const requestBody = attackDiscoveryPublicApiEnabled
    ? transformAttackDiscoveryScheduleUpdatePropsToApi(body)
    : body;

  return KibanaServices.get().http.put<UpdateAttackDiscoverySchedulesResponse>(
    replaceParams(route, { id }),
    {
      body: JSON.stringify(requestBody),
      version,
      signal,
    }
  );
};

export interface DeleteAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Deletes the attack discovery schedule. */
export const deleteAttackDiscoverySchedule = async ({
  id,
  signal,
  attackDiscoveryPublicApiEnabled,
}: DeleteAttackDiscoveryScheduleParams): Promise<DeleteAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_BY_ID
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;
  return KibanaServices.get().http.delete<DeleteAttackDiscoverySchedulesResponse>(
    replaceParams(route, { id }),
    {
      version,
      signal,
    }
  );
};

export interface EnableAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Enables the attack discovery schedule. */
export const enableAttackDiscoverySchedule = async ({
  id,
  signal,
  attackDiscoveryPublicApiEnabled,
}: EnableAttackDiscoveryScheduleParams): Promise<EnableAttackDiscoverySchedulesResponse> => {
  const isPublic = !!attackDiscoveryPublicApiEnabled;
  const route = isPublic
    ? ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_ENABLE;
  const version = isPublic ? API_VERSIONS.public.v1 : API_VERSIONS.internal.v1;
  return KibanaServices.get().http.post<EnableAttackDiscoverySchedulesResponse>(
    replaceParams(route, { id }),
    {
      version,
      signal,
    }
  );
};

export interface DisableAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */
export const disableAttackDiscoverySchedule = async ({
  attackDiscoveryPublicApiEnabled,
  id,
  signal,
}: DisableAttackDiscoveryScheduleParams): Promise<DisableAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_DISABLE;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;
  return KibanaServices.get().http.post<DisableAttackDiscoverySchedulesResponse>(
    replaceParams(route, { id }),
    {
      version,
      signal,
    }
  );
};

export interface FindAttackDiscoveryScheduleParams {
  /** Feature flag that enables the attack discovery public API */
  attackDiscoveryPublicApiEnabled: boolean;
  /** Optional page number to retrieve */
  page?: number;
  /** Optional number of documents per page to retrieve */
  perPage?: number;
  /** Optional field of the attack discovery schedule object to sort results by */
  sortField?: string;
  /** Optional direction to sort results by */
  sortDirection?: 'asc' | 'desc';
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves attack discovery schedules. */
export const findAttackDiscoverySchedule = async ({
  attackDiscoveryPublicApiEnabled,
  page,
  perPage,
  sortField,
  sortDirection,
  signal,
}: FindAttackDiscoveryScheduleParams): Promise<FindAttackDiscoverySchedulesResponse> => {
  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_FIND
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND;
  const version = attackDiscoveryPublicApiEnabled
    ? API_VERSIONS.public.v1
    : API_VERSIONS.internal.v1;

  const query = attackDiscoveryPublicApiEnabled
    ? // public API expects snake_case query params
      { page, per_page: perPage, sort_field: sortField, sort_direction: sortDirection }
    : // internal API uses camelCase
      { page, perPage, sortField, sortDirection };

  return KibanaServices.get().http.get<FindAttackDiscoverySchedulesResponse>(route, {
    version,
    query,
    signal,
  });
};

/** Retrieves registered rule types. */
export const fetchRuleTypes = async (params?: {
  signal?: AbortSignal;
}): Promise<Array<AsApiContract<RuleType<string, string>>>> => {
  const { signal } = params ?? {};
  return KibanaServices.get().http.get<Array<AsApiContract<RuleType<string, string>>>>(
    ALERTING_RULE_TYPES_URL,
    { signal }
  );
};
