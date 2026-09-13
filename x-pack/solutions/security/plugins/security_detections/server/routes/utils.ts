/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-exports from detection_route_helpers.ts for backward compatibility.
 *
 * The shared route plumbing for the Detection Engine v2 routes lives in
 * `detection_route_helpers.ts`. This file re-exports it so that step 8.6
 * (CRUD routes) and step 8.8 (action routes) have a stable import surface.
 *
 * The `assertAlertingEnabled` and `toErrorResponse` functions are the ones
 * every handler needs. The path constants provide the canonical API paths
 * to avoid string duplication across files.
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares"
 */

export {
  DETECTION_ENGINE_V2_BASE_PATH,
  DETECTION_ENGINE_V2_RULES_PATH,
  DETECTION_ENGINE_V2_RULE_PATH,
  DETECTION_ENGINE_V2_TAGS_PATH,
  assertAlertingEnabled,
  toErrorResponse,
  detectionOnRequestValidationError,
} from './detection_route_helpers';

export type { DetectionsPluginStartDeps } from './types';
