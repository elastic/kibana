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
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
} from '@kbn/elastic-assistant-common';
import { KibanaServices } from '../../../../../common/lib/kibana';

export const ALERTING_RULE_TYPES_URL = `${BASE_ALERTING_API_PATH}/rule_types` as const;

export interface CreateAttackDiscoveryScheduleParams {
  /** The body containing the schedule attributes */
  body: AttackDiscoveryScheduleCreateProps;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Creates a new attack discovery schedule with the provided attributes. */
export const createAttackDiscoverySchedule = async ({
  body,
  signal,
}: CreateAttackDiscoveryScheduleParams): Promise<CreateAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.post<CreateAttackDiscoverySchedulesResponse>(
    ATTACK_DISCOVERY_SCHEDULES,
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface GetAttackDiscoveryScheduleParams {
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Retrieves the attack discovery schedule. */
export const getAttackDiscoverySchedule = async ({
  id,
  signal,
}: GetAttackDiscoveryScheduleParams): Promise<GetAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.get<GetAttackDiscoverySchedulesResponse>(
    replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
    { version: '1', signal }
  );
};

export interface UpdateAttackDiscoveryScheduleParams {
  /** `id` of the attack discovery schedule */
  id: string;
  /** The body containing the schedule attributes */
  body: AttackDiscoveryScheduleUpdateProps;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Updates the attack discovery schedule. */
export const updateAttackDiscoverySchedule = async ({
  id,
  body,
  signal,
}: UpdateAttackDiscoveryScheduleParams): Promise<UpdateAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.put<UpdateAttackDiscoverySchedulesResponse>(
    replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
    { body: JSON.stringify(body), version: '1', signal }
  );
};

export interface DeleteAttackDiscoveryScheduleParams {
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Deletes the attack discovery schedule. */
export const deleteAttackDiscoverySchedule = async ({
  id,
  signal,
}: DeleteAttackDiscoveryScheduleParams): Promise<DeleteAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.delete<DeleteAttackDiscoverySchedulesResponse>(
    replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
    { version: '1', signal }
  );
};

export interface EnableAttackDiscoveryScheduleParams {
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Enables the attack discovery schedule. */
export const enableAttackDiscoverySchedule = async ({
  id,
  signal,
}: EnableAttackDiscoveryScheduleParams): Promise<EnableAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.post<EnableAttackDiscoverySchedulesResponse>(
    replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE, { id }),
    { version: '1', signal }
  );
};

export interface DisableAttackDiscoveryScheduleParams {
  /** `id` of the attack discovery schedule */
  id: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}
/** Disables the attack discovery schedule. */
export const disableAttackDiscoverySchedule = async ({
  id,
  signal,
}: DisableAttackDiscoveryScheduleParams): Promise<DisableAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.post<DisableAttackDiscoverySchedulesResponse>(
    replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, { id }),
    { version: '1', signal }
  );
};

export interface FindAttackDiscoveryScheduleParams {
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
  page,
  perPage,
  sortField,
  sortDirection,
  signal,
}: FindAttackDiscoveryScheduleParams): Promise<FindAttackDiscoverySchedulesResponse> => {
  return KibanaServices.get().http.get<FindAttackDiscoverySchedulesResponse>(
    ATTACK_DISCOVERY_SCHEDULES_FIND,
    { version: '1', query: { page, perPage, sortField, sortDirection }, signal }
  );
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
