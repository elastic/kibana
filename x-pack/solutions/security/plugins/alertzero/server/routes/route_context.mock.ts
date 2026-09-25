/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

type RouteContext = Parameters<RequestHandler>[0];

/**
 * Minimal request handler context for route tests: every AlertZero handler is wrapped in
 * `withAlertZeroEnabled`, which reads the enablement setting off `context.core.uiSettings`.
 */
export const createRouteContextMock = ({
  settingEnabled = true,
}: { settingEnabled?: boolean } = {}): RouteContext =>
  ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(settingEnabled) } },
    }),
  } as unknown as RouteContext);
