/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFlyoutApi } from './use_rule_flyout_api';

/**
 * Returns a `useRuleFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useRuleFlyoutApi).mockReturnValue(createRuleFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createRuleFlyoutApiMock = (): jest.Mocked<RuleFlyoutApi> => ({
  openRuleFlyout: jest.fn(),
  openRuleFlyoutAsChild: jest.fn(),
});
