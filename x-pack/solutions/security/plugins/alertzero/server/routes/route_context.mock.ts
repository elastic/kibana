/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubscriptionAvailability } from '../../common/availability';
import type { AlertZeroRequestHandlerContext } from '../types';

/**
 * Minimal request handler context for route tests: every AlertZero handler is wrapped in
 * `withAlertZeroEnabled`, which reads the enablement setting off `context.core.uiSettings`.
 */
export const createRouteContextMock = ({
  settingEnabled = true,
  subscription = 'available',
  hasRequiredDependencies = true,
}: {
  settingEnabled?: boolean;
  subscription?: SubscriptionAvailability;
  hasRequiredDependencies?: boolean;
} = {}): AlertZeroRequestHandlerContext =>
  ({
    alertzero: Promise.resolve({ subscription, hasRequiredDependencies }),
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(settingEnabled) } },
    }),
  }) as unknown as AlertZeroRequestHandlerContext;
