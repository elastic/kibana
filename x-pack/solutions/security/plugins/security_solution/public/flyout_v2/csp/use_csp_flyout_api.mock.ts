/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CspFlyoutApi } from './use_csp_flyout_api';

/**
 * Returns a `useCspFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useCspFlyoutApi).mockReturnValue(createCspFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createCspFlyoutApiMock = (): jest.Mocked<CspFlyoutApi> => ({
  openMisconfigurationFinding: jest.fn(),
  openMisconfigurationFindingAsChild: jest.fn(),
  openVulnerabilityFinding: jest.fn(),
  openVulnerabilityFindingAsChild: jest.fn(),
});
