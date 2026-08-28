/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IocFlyoutApi } from './use_ioc_flyout_api';

/**
 * Returns a `useIocFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useIocFlyoutApi).mockReturnValue(createIocFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createIocFlyoutApiMock = (): jest.Mocked<IocFlyoutApi> => ({
  openIocFlyout: jest.fn(),
  openIocFlyoutAsChild: jest.fn(),
});
