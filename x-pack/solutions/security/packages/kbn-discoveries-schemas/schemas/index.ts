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
  PostValidateRequestBody,
  PostValidateResponse,
} from './routes/post/validate/post_validate.gen';

export { AttackDiscoveryApiAlert } from './attack_discovery/attack_discovery_api_alert.gen';

export { Replacements, Provider, ApiConfig } from './common_attributes.gen';

// Common types
export { ERROR_CATEGORIES } from './common/error_category';
export type { ErrorCategory } from './common/error_category';

// Schedule route schemas. These are types + Zod schemas used by schedule
// routes added in PR10. Exported from PR1 so that intermediate PRs (PR3+)
// containing schedule route handlers can type-check FF-off; runtime
// registration of the schedule routes still happens only in PR10 +
// downstream when the feature flag is on.
export {
  CreateAttackDiscoveryScheduleRequestBody,
  CreateAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/create_schedule_route.gen';
export {
  DisableAttackDiscoveryScheduleRequestParams,
  DisableAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/disable_schedule_route.gen';
export {
  EnableAttackDiscoveryScheduleRequestParams,
  EnableAttackDiscoveryScheduleResponse,
} from './routes/post/schedules/enable_schedule_route.gen';
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

// Common schedule types referenced by the route schemas above.
export {
  AttackDiscoveryApiConfig,
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
  ScheduleAction,
  ScheduleGeneralAction,
  WorkflowConfig,
} from './common/schedules/schedule_types.gen';

// Schedule workflow config validation (at-least-one-toggle).
export {
  AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
  hasAtLeastOneRetrievalToggle,
} from './common/schedules/workflow_config_validation';

// Note: workflow_steps/* is added in later PRs alongside its source files.
