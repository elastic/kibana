/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, KibanaResponseFactory } from '@kbn/core/server';

export const ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled';

/**
 * Checks whether the Attack Discovery workflows feature flag is enabled.
 * Returns `null` when the flag is ON (caller should proceed), or a 404
 * response when the flag is OFF (caller should return it immediately).
 */
export const assertFeatureFlagEnabled = async ({
  coreContext,
  response,
}: {
  coreContext: CoreRequestHandlerContext;
  response: KibanaResponseFactory;
}) => {
  const isEnabled = await coreContext.featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
    false
  );

  if (!isEnabled) {
    return response.notFound({
      body: { message: 'Attack Discovery workflows are not enabled' },
    });
  }

  return null;
};
