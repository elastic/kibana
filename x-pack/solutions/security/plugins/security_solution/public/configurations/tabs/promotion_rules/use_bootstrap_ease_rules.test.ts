/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useSecuritySolutionInitialization } from '../../../common/components/initialization/use_security_solution_initialization';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { INITIALIZATION_FLOW_INIT_PREBUILT_RULES } from '../../../../common/api/initialization';
import { useBootstrapEaseRulesMutation } from '../../../detection_engine/rule_management/api/hooks/prebuilt_rules/use_bootstrap_ease_rules';
import { useBootstrapEaseRules, useIsBootstrappingEaseRules } from './use_bootstrap_ease_rules';

vi.mock('../../../common/components/initialization/use_security_solution_initialization');
vi.mock('../../../common/components/user_privileges');
vi.mock('../../../common/hooks/use_app_toasts');
vi.mock(
  '../../../detection_engine/rule_management/api/hooks/prebuilt_rules/use_bootstrap_ease_rules'
);

// useIsMutating is used by useIsBootstrappingEaseRules
vi.mock('@kbn/react-query', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/react-query')),
    useIsMutating: vi.fn().mockReturnValue(0),
  };
  return { ...mocked, default: mocked };
});

const mockAddError = vi.fn();
const mockMutate = vi.fn();

const useSecuritySolutionInitializationMock = useSecuritySolutionInitialization as MockedFunction<
  typeof useSecuritySolutionInitialization
>;
const useUserPrivilegesMock = useUserPrivileges as MockedFunction<typeof useUserPrivileges>;
const useBootstrapEaseRulesMutationMock = useBootstrapEaseRulesMutation as MockedFunction<
  typeof useBootstrapEaseRulesMutation
>;

const mockInitState = ({
  status,
  error,
}: {
  status: 'loading' | 'ready' | 'error';
  error?: string | null;
}) => {
  const flowState =
    status === 'loading'
      ? { loading: true as const }
      : {
          loading: false as const,
          result:
            status === 'ready'
              ? { status: 'ready' as const }
              : { status: 'error' as const, error: error ?? null },
        };
  useSecuritySolutionInitializationMock.mockReturnValue({
    [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: flowState,
  } as never);
};

const mockUserPrivileges = ({ canEditRules }: { canEditRules: boolean }) => {
  useUserPrivilegesMock.mockReturnValue({
    rulesPrivileges: {
      rules: { read: true, edit: canEditRules },
    },
  } as never);
};

describe('useBootstrapEaseRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({ addError: mockAddError });
    useBootstrapEaseRulesMutationMock.mockReturnValue({ mutate: mockMutate } as never);
  });

  it('calls bootstrapEaseRules when prebuilt rules are ready and user can edit rules', () => {
    mockInitState({ status: 'ready' });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('does not call bootstrapEaseRules when prebuilt rules are still loading', () => {
    mockInitState({ status: 'loading' });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call bootstrapEaseRules when user lacks rule edit privileges', () => {
    mockInitState({ status: 'ready' });
    mockUserPrivileges({ canEditRules: false });

    renderHook(() => useBootstrapEaseRules());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call bootstrapEaseRules when prebuilt rules init failed', () => {
    mockInitState({ status: 'error', error: 'Fleet unavailable' });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows an error toast when prebuilt rules init fails', () => {
    mockInitState({ status: 'error', error: 'Fleet unavailable' });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockAddError).toHaveBeenCalledWith(new Error('Fleet unavailable'), {
      title: expect.any(String),
    });
  });

  it('shows an error toast with fallback message when error is null', () => {
    mockInitState({ status: 'error', error: null });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockAddError).toHaveBeenCalledWith(new Error('Unknown error'), {
      title: expect.any(String),
    });
  });

  it('does not show an error toast when prebuilt rules are ready', () => {
    mockInitState({ status: 'ready' });
    mockUserPrivileges({ canEditRules: true });

    renderHook(() => useBootstrapEaseRules());

    expect(mockAddError).not.toHaveBeenCalled();
  });
});

describe('useIsBootstrappingEaseRules', () => {
  it('returns false when no mutation is in flight', async () => {
    const { useIsMutating } = await vi.importMock('@kbn/react-query');
    useIsMutating.mockReturnValue(0);

    const { result } = renderHook(() => useIsBootstrappingEaseRules());

    expect(result.current).toBe(false);
  });

  it('returns true when a mutation is in flight', async () => {
    const { useIsMutating } = await vi.importMock('@kbn/react-query');
    useIsMutating.mockReturnValue(1);

    const { result } = renderHook(() => useIsBootstrappingEaseRules());

    expect(result.current).toBe(true);
  });
});
