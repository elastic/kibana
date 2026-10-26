/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  API_BASE_PATH,
  API_PATHS,
  API_PRIVILEGES,
  API_VERSION,
  APP_ID,
  APP_ROUTE,
  CLIENT_ID_PREFIX,
  FEATURE_ID,
  LIMITS,
  PLUGIN_ID,
  SDK_KEY_HINT_LENGTH,
  SDK_KEY_PREFIX,
  UI_CAPABILITIES,
} from './constants';

export {
  ENTITY_KEY_PATTERN,
  FLAG_KEY_PATTERN,
  appKeySchema,
  deleteQuerySchema,
  entityListQuerySchema,
  environmentKeySchema,
  errorResponseSchema,
  flagKeySchema,
} from './schemas/common';
export type { EntityListQuery, ErrorResponse } from './schemas/common';

export {
  createEnvironmentRequestSchema,
  environmentParamsSchema,
  environmentSchema,
  listEnvironmentsResponseSchema,
  updateEnvironmentRequestSchema,
} from './schemas/environments';
export type {
  CreateEnvironmentRequest,
  Environment,
  EnvironmentAttributes,
  ListEnvironmentsResponse,
  UpdateEnvironmentRequest,
} from './schemas/environments';

export {
  appParamsSchema,
  appSchema,
  createAppRequestSchema,
  listAppsResponseSchema,
  updateAppRequestSchema,
} from './schemas/apps';
export type {
  App,
  AppAttributes,
  CreateAppRequest,
  ListAppsResponse,
  UpdateAppRequest,
} from './schemas/apps';

export {
  credentialParamsSchema,
  credentialSchema,
  listCredentialsResponseSchema,
  rotateCredentialRequestSchema,
  rotateCredentialResponseSchema,
} from './schemas/credentials';
export type {
  Credential,
  CredentialParams,
  ListCredentialsResponse,
  RotateCredentialRequest,
  RotateCredentialResponse,
} from './schemas/credentials';

export {
  MATCH_OPERATORS,
  SEMVER_OPERATORS,
  VALUE_TYPES,
  createFlagRequestSchema,
  environmentRuleSetSchema,
  flagDefinitionSchema,
  flagHistoryQuerySchema,
  flagHistoryResponseSchema,
  flagParamsSchema,
  flagSchema,
  listFlagsQuerySchema,
  listFlagsResponseSchema,
  prerequisiteSchema,
  ruleSchema,
  updateFlagRequestSchema,
  variationValueSchema,
} from './schemas/flags';
export type {
  CreateFlagRequest,
  CreatedBy,
  EnvironmentRuleSet,
  Flag,
  FlagDefinition,
  FlagHistoryItem,
  FlagHistoryQuery,
  FlagHistoryResponse,
  FlagSnapshot,
  ListFlagsQuery,
  ListFlagsResponse,
  MatchOperator,
  MatchRule,
  PercentageRule,
  Prerequisite,
  Rule,
  UpdateFlagRequest,
  ValueType,
  VariationValue,
} from './schemas/flags';

export {
  listObservedContextsQuerySchema,
  listObservedContextsResponseSchema,
  observedAttributesQuerySchema,
  observedAttributesResponseSchema,
  observedValuesQuerySchema,
  observedValuesResponseSchema,
} from './schemas/observed_contexts';
export type {
  ListObservedContextsQuery,
  ListObservedContextsResponse,
  ObservedAttribute,
  ObservedAttributesQuery,
  ObservedAttributesResponse,
  ObservedContext,
  ObservedValue,
  ObservedValuesQuery,
  ObservedValuesResponse,
} from './schemas/observed_contexts';

export {
  SEMVER_PATTERN,
  findPrerequisiteCycle,
  isVariation,
  validateFlagConsistency,
} from './flag_validation';
export type { FlagConsistencyInput, PrerequisiteGraph, ValidationIssue } from './flag_validation';
