/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RuleBootstrapResults } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import { BOOTSTRAP_EASE_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { bootstrapEaseRules } from '../../api';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';
import {
  BOOTSTRAP_EASE_RULES_KEY,
  useBootstrapEaseRulesMutation,
} from './use_bootstrap_ease_rules';

jest.mock('../../api', () => ({
  bootstrapEaseRules: jest.fn(),
}));
jest.mock('../use_find_rules_query');

const bootstrapEaseRulesMock = bootstrapEaseRules as jest.MockedFunction<typeof bootstrapEaseRules>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const createMockResponse = (
  overrides: Partial<RuleBootstrapResults> = {}
): RuleBootstrapResults => ({
  total: 0,
  installed: 0,
  updated: 0,
  deleted: 0,
  skipped: 0,
  errors: [],
  ...overrides,
});

describe('useBootstrapEaseRulesMutation', () => {
  let invalidateFindRulesQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateFindRulesQuery = jest.fn();
    (useInvalidateFindRulesQuery as jest.Mock).mockReturnValue(invalidateFindRulesQuery);
  });

  describe('BOOTSTRAP_EASE_RULES_KEY', () => {
    it('uses the correct mutation key', () => {
      expect(BOOTSTRAP_EASE_RULES_KEY).toEqual(['POST', BOOTSTRAP_EASE_RULES_URL]);
    });
  });

  it('calls bootstrapEaseRules API on mutate', async () => {
    bootstrapEaseRulesMock.mockResolvedValue(createMockResponse());

    const { result } = renderHook(() => useBootstrapEaseRulesMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(bootstrapEaseRulesMock).toHaveBeenCalledTimes(1);
  });

  describe('onSuccess', () => {
    it('invalidates find rules query when rules were installed', async () => {
      bootstrapEaseRulesMock.mockResolvedValue(createMockResponse({ installed: 3 }));

      const { result } = renderHook(() => useBootstrapEaseRulesMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(invalidateFindRulesQuery).toHaveBeenCalledTimes(1);
    });

    it('invalidates find rules query when rules were updated', async () => {
      bootstrapEaseRulesMock.mockResolvedValue(createMockResponse({ updated: 2 }));

      const { result } = renderHook(() => useBootstrapEaseRulesMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(invalidateFindRulesQuery).toHaveBeenCalledTimes(1);
    });

    it('invalidates find rules query when rules were deleted', async () => {
      bootstrapEaseRulesMock.mockResolvedValue(createMockResponse({ deleted: 1 }));

      const { result } = renderHook(() => useBootstrapEaseRulesMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(invalidateFindRulesQuery).toHaveBeenCalledTimes(1);
    });

    it('does not invalidate find rules query when no rules changed', async () => {
      bootstrapEaseRulesMock.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useBootstrapEaseRulesMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(invalidateFindRulesQuery).not.toHaveBeenCalled();
    });

    it('calls the provided onSuccess callback', async () => {
      const response = createMockResponse({ installed: 1 });
      bootstrapEaseRulesMock.mockResolvedValue(response);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useBootstrapEaseRulesMutation({ onSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(onSuccess).toHaveBeenCalledWith(response, undefined, undefined);
    });
  });
});
