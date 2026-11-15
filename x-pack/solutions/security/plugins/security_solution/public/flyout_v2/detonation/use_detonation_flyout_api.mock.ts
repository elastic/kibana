/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetonationFlyoutApi } from './use_detonation_flyout_api';

/**
 * Returns a `useDetonationFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 */
export const createDetonationFlyoutApiMock = (): jest.Mocked<DetonationFlyoutApi> => ({
  openDetonationFlyoutAsChild: jest.fn(),
});
