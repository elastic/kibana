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

/**
 * Named execution-context labels for Entity Analytics client requests.
 * Add new entries here rather than inlining literal strings at call sites.
 * Mirror of the server-side `EA_EXECUTION_CONTEXT_NAMES` in
 * `server/lib/entity_analytics/execution_context.ts`.
 */
export const EA_EXECUTION_CONTEXT_NAMES = {
  RISK_SCORE_MANAGEMENT: buildEaName('risk_score_management'),
} as const;

export type EaExecutionContextName =
  (typeof EA_EXECUTION_CONTEXT_NAMES)[keyof typeof EA_EXECUTION_CONTEXT_NAMES];

/** Builds a child execution context for a Security Solution request while retaining app context. */
export const buildExecutionContext = (
  name: string,
  id: string
): { child: KibanaExecutionContext } => ({
  child: {
    type: EXECUTION_CONTEXT_TYPE,
    name,
    id,
  },
});
