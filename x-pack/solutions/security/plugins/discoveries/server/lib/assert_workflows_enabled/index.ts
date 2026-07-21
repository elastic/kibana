/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import { ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';

export { ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG };

/**
 * Checks the `attackDiscoveryWorkflowsEnabled` feature flag via the request
 * context. Returns a 404 response when the flag is OFF, or `null` when the
 * flag is ON (indicating the caller may proceed).
 */
export const assertWorkflowsEnabled = async ({
  context,
  response,
}: {
  context: RequestHandlerContext;
  response: KibanaResponseFactory;
}): Promise<ReturnType<KibanaResponseFactory['notFound']> | null> => {
  const coreContext = await context.core;
  const enabled =
    (await coreContext?.featureFlags?.getBooleanValue(
      ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
      false
    )) ?? false;

  if (!enabled) {
    return response.notFound({
      body: { message: 'Attack Discovery workflows are not enabled' },
    });
  }

  return null;
};
