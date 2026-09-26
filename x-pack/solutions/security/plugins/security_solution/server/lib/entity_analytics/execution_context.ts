/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const EXECUTION_CONTEXT_TYPE = 'security_solution';
const EA_NAME_PREFIX = 'entity_analytics';

const buildEaName = <TSuffix extends string>(
  suffix: TSuffix
): `${typeof EA_NAME_PREFIX}:${TSuffix}` => `${EA_NAME_PREFIX}:${suffix}`;

export const EA_EXECUTION_CONTEXT_NAMES = {
  LEAD_GENERATION_TASK: buildEaName('lead_generation_task'),
  PRIVILEGE_MONITORING_TASK: buildEaName('privilege_monitoring_task'),
  RISK_SCORING_TASK: buildEaName('risk_scoring_task'),
  ASSET_CRITICALITY_ECS_MIGRATION: buildEaName('asset_criticality_ecs_migration'),
  ASSET_CRITICALITY_MIGRATION: buildEaName('asset_criticality_migration'),
  RISK_SCORE_MIGRATION: buildEaName('risk_score_migration'),
} as const;

export type EaExecutionContextName =
  (typeof EA_EXECUTION_CONTEXT_NAMES)[keyof typeof EA_EXECUTION_CONTEXT_NAMES];

/** Builds a server-side Security Solution Entity Analytics execution context payload. */
export const buildEaExecutionContext = (
  name: EaExecutionContextName,
  id: string
): KibanaExecutionContext => ({
  type: EXECUTION_CONTEXT_TYPE,
  name,
  id,
});
