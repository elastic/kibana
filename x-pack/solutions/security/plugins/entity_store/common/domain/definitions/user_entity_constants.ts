/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical `entity.namespace` value for non-IDP local user identity
 * (`userEntityDefinition` ranking branch, fieldEvaluations, streamlang conditions).
 */
export const USER_ENTITY_NAMESPACE = {
  Local: 'local',
} as const;

export type UserEntityLocalNamespace =
  (typeof USER_ENTITY_NAMESPACE)[keyof typeof USER_ENTITY_NAMESPACE];

/** User names excluded from local namespace (system/service accounts). Used by `userEntityDefinition` non-IDP filters. */
export const LOCAL_NAMESPACE_EXCLUDED_USER_NAMES = [
  'root',
  'bin',
  'daemon',
  'sys',
  'nobody',
  'jenkins',
  'ansible',
  'deploy',
  'terraform',
  'gitlab-runner',
  'postgres',
  'mysql',
  'redis',
  'elasticsearch',
  'kafka',
  'admin',
  'operator',
  'service',
] as const;

/**
 * Allowed values for `entity.confidence`. Producers:
 *  - `high` / `medium`: user-tier disambiguation (see `user.ts` after-stats
 *    overrides), denoting a directly-observed identity with strong (`high`)
 *    or partial (`medium`) evidence.
 *  - `low`: written by the `ki-promotion` maintainer on entities promoted
 *    from the generic engine into a static (host/service) engine to mark
 *    them as derived rather than directly observed. The maintainer clears
 *    the field on demote.
 *
 * Kept in sync with the `confidence` enum in `entity.schema.yaml`.
 */
export const ENTITY_CONFIDENCE = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;

export type EntityConfidence = (typeof ENTITY_CONFIDENCE)[keyof typeof ENTITY_CONFIDENCE];
