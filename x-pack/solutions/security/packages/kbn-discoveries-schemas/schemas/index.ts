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

// Note: workflow_steps/* and common/schedules/* and routes/{get,post,put,delete}/schedules/*
// are added in later PRs alongside their source files.
