/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';

export const ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled' as const;

/**
 * Reads the `attackDiscoveryWorkflowsEnabled` feature flag from the global,
 * request-free feature flags service (`coreStart.featureFlags`). Unlike the
 * request-context variant used by HTTP routes, this can be called from any
 * server context that has access to start services — including the Task
 * Manager scheduled rule executor and workflow step handlers.
 */
export const isWorkflowsEnabled = (
  featureFlags: Pick<CoreStart['featureFlags'], 'getBooleanValue'>
): Promise<boolean> =>
  featureFlags.getBooleanValue(ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG, true);
