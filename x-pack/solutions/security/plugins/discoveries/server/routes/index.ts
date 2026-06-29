/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

// Stub: real route registrations are added by later PRs in the stack. PR2's
// plugin scaffold needs `./routes` to resolve as a module so the plugin can
// load and its tests can run; the no-op registration preserves FF-off prod
// safety in PR2 standalone (no new routes are exposed).
export const registerRoutes = (
  _router: IRouter,
  _logger: Logger,
  _services: Record<string, unknown>
): void => {
  // no-op stub; replaced by real route registrations in later PRs
};
