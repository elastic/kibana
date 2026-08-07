/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Explicit allow-list of the schema types/values consumed by external packages.
// Keep this narrow: only symbols imported from `@kbn/discoveries-schemas` elsewhere
// belong here (the full generated surface lives in `./schemas`).
export {
  AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
  AttackDiscoveryApiAlert,
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
  CreateAttackDiscoveryScheduleRequestBody,
  CreateAttackDiscoveryScheduleResponse,
  DeleteAttackDiscoveryScheduleRequestParams,
  DeleteAttackDiscoveryScheduleResponse,
  DisableAttackDiscoveryScheduleRequestParams,
  DisableAttackDiscoveryScheduleResponse,
  EnableAttackDiscoveryScheduleRequestParams,
  EnableAttackDiscoveryScheduleResponse,
  ERROR_CATEGORIES,
  FindAttackDiscoverySchedulesRequestQuery,
  FindAttackDiscoverySchedulesResponse,
  GetAttackDiscoveryScheduleRequestParams,
  GetAttackDiscoveryScheduleResponse,
  hasAtLeastOneRetrievalToggle,
  PostGenerateRequestBody,
  PostGenerateResponse,
  PostValidateRequestBody,
  PostValidateResponse,
  ScheduleAction,
  ScheduleGeneralAction,
  UpdateAttackDiscoveryScheduleRequestBody,
  UpdateAttackDiscoveryScheduleRequestParams,
  UpdateAttackDiscoveryScheduleResponse,
  WorkflowConfig,
} from './schemas';

export type { ErrorCategory } from './schemas';
