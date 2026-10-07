/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharedToolsFlyoutApi } from './use_shared_tools_flyout_api';

/**
 * Returns a `useSharedToolsFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useSharedToolsFlyoutApi).mockReturnValue(createSharedToolsFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createSharedToolsFlyoutApiMock = (): jest.Mocked<SharedToolsFlyoutApi> => ({
  openNotes: jest.fn(),
});
