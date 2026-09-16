/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NetworkFlyoutApi } from './use_network_flyout_api';

/**
 * Returns a `useNetworkFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useNetworkFlyoutApi).mockReturnValue(createNetworkFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createNetworkFlyoutApiMock = (): jest.Mocked<NetworkFlyoutApi> => ({
  openNetworkFlyout: jest.fn(),
  openNetworkFlyoutAsChild: jest.fn(),
});
