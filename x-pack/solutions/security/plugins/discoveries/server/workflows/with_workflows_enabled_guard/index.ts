/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { isWorkflowsEnabled } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';

import type { DiscoveriesPluginStartDeps } from '../../types';

type GetStartServices = () => Promise<{
  coreStart: CoreStart;
  pluginsStart: DiscoveriesPluginStartDeps;
}>;

/**
 * Wraps a workflow step definition's `handler` with the Attack Discovery
 * workflows feature-flag kill-switch. When the flag is OFF the guarded handler
 * throws before the wrapped handler body runs, so directly invoking a
 * `system-attack-discovery-*` managed workflow (e.g. via workflows_management)
 * does no real work while the flag is disabled.
 *
 * The returned object preserves the original step definition's shape (id,
 * schemas, config) and only replaces `handler`.
 */
export const withWorkflowsEnabledGuard = <
  T extends { handler: (context: never) => Promise<unknown> }
>(
  stepDefinition: T,
  getStartServices: GetStartServices
): T => ({
  ...stepDefinition,
  handler: (async (context: Parameters<T['handler']>[0]) => {
    const { coreStart } = await getStartServices();

    if (!(await isWorkflowsEnabled(coreStart.featureFlags))) {
      throw new Error('Attack Discovery workflows are not enabled');
    }

    return stepDefinition.handler(context);
  }) as T['handler'],
});
