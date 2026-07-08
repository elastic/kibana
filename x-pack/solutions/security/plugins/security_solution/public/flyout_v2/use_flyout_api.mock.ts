/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutApi } from './use_flyout_api';
import { createAttackFlyoutApiMock } from './attack/use_attack_flyout_api.mock';

/**
 * Returns a `useFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Composes the per-type mocks, mirroring how the real hook composes the per-type hooks.
 * Use with `jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock())` and assert against
 * the individual method you care about.
 */
export const createFlyoutApiMock = (): jest.Mocked<FlyoutApi> => ({
  ...createAttackFlyoutApiMock(),
});
