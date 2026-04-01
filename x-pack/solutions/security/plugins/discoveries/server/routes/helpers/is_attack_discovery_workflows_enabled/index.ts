/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';

export const ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled';

export const isAttackDiscoveryWorkflowsEnabled = async (
  context: RequestHandlerContext
): Promise<boolean> => {
  const coreContext = await context.core;
  return coreContext.featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
    false
  );
};
