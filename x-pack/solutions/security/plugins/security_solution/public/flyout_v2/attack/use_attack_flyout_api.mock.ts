/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackFlyoutApi } from './use_attack_flyout_api';

/**
 * Returns a `useAttackFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useAttackFlyoutApi).mockReturnValue(createAttackFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createAttackFlyoutApiMock = (): jest.Mocked<AttackFlyoutApi> => ({
  openAttackFlyout: jest.fn(),
  openAttackFlyoutAsChild: jest.fn(),
  openAttackCorrelations: jest.fn(),
  openAttackEntities: jest.fn(),
});
