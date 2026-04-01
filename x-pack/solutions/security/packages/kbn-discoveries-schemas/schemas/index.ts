/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export all generated types and schemas
export {
  PostGenerateRequestBody,
  PostGenerateResponse,
} from './routes/post/generate/post_generate.gen';

export {
  PostGenerateWorkflowRequestBody,
  PostGenerateWorkflowResponse,
} from './routes/post/generate_workflow/post_generate_workflow.gen';

export {
  PostValidateRequestBody,
  PostValidateResponse,
} from './routes/post/validate/post_validate.gen';

export { AttackDiscoveryApiAlert } from './attack_discovery/attack_discovery_api_alert.gen';

// Workflow steps
// Note: default_alert_retrieval file contains DefaultAlertRetrieval types
// (file named to avoid ESLint restrictions on "legacy" keyword)
export {
  DefaultAlertRetrievalInput,
  DefaultAlertRetrievalOutput,
} from './workflow_steps/default_alert_retrieval.gen';

export {
  DefaultValidationInput,
  DefaultValidationOutput,
} from './workflow_steps/default_validation.gen';

export { Replacements, Provider, ApiConfig } from './common_attributes.gen';

// Common types
export { ERROR_CATEGORIES } from './common/error_category';
export type { ErrorCategory } from './common/error_category';

// Schedule types (common)
export {
  AttackDiscoveryApiConfig,
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
  IntervalSchedule,
  ScheduleAction,
  ScheduleActionFrequency,
  ScheduleActionNotifyWhen,
  ScheduleExecution,
  ScheduleExecutionStatus,
  ScheduleGeneralAction,
  ScheduleSystemAction,
  WorkflowConfig,
} from './common/schedules/schedule_types.gen';

// Schedule routes
export {
  CreateAttackDiscoveryScheduleRequestBody,
  CreateAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/create_schedule_route.gen';

export {
  FindAttackDiscoverySchedulesRequestQuery,
  FindAttackDiscoverySchedulesResponse,
} from './routes/get/schedules/find_schedules_route.gen';

export {
  GetAttackDiscoveryScheduleRequestParams,
  GetAttackDiscoveryScheduleResponse,
} from './routes/get/schedules/get_schedule_route.gen';

export {
  UpdateAttackDiscoveryScheduleRequestBody,
  UpdateAttackDiscoveryScheduleRequestParams,
  UpdateAttackDiscoveryScheduleResponse,
} from './routes/put/schedules/update_schedule_route.gen';

export {
  DeleteAttackDiscoveryScheduleRequestParams,
  DeleteAttackDiscoveryScheduleResponse,
} from './routes/delete/schedules/delete_schedule_route.gen';

export {
  EnableAttackDiscoveryScheduleRequestParams,
  EnableAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/enable_schedule_route.gen';

export {
  DisableAttackDiscoveryScheduleRequestParams,
  DisableAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/disable_schedule_route.gen';
