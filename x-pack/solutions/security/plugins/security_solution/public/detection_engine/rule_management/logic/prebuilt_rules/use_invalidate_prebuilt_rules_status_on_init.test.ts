/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { renderHook } from '@testing-library/react';
import { INITIALIZATION_FLOW_INIT_PREBUILT_RULES } from '../../../../../common/api/initialization';
import { useSecuritySolutionInitialization } from '../../../../common/components/initialization/use_security_solution_initialization';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useInvalidatePrebuiltRulesStatusOnInit } from './use_invalidate_prebuilt_rules_status_on_init';

vi.mock('../../../../common/components/initialization/use_security_solution_initialization');
vi.mock('../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query');

const useSecuritySolutionInitializationMock = useSecuritySolutionInitialization as MockedFunction<
  typeof useSecuritySolutionInitialization
>;

const mockInvalidate = vi.fn();

const mockInitState = ({ loading }: { loading: boolean }) => {
  useSecuritySolutionInitializationMock.mockReturnValue({
    [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: loading
      ? { loading: true as const, result: null }
      : { loading: false as const, result: { status: 'ready' as const } },
  } as never);
};

describe('useInvalidatePrebuiltRulesStatusOnInit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useInvalidateFetchPrebuiltRulesStatusQuery as Mock).mockReturnValue(mockInvalidate);
  });

  it('invalidates the status query when package installation completes', () => {
    mockInitState({ loading: false });

    renderHook(() => useInvalidatePrebuiltRulesStatusOnInit());

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate while package installation is in progress', () => {
    mockInitState({ loading: true });

    renderHook(() => useInvalidatePrebuiltRulesStatusOnInit());

    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('invalidates when loading transitions from true to false', () => {
    mockInitState({ loading: true });

    const { rerender } = renderHook(() => useInvalidatePrebuiltRulesStatusOnInit());

    expect(mockInvalidate).not.toHaveBeenCalled();

    mockInitState({ loading: false });
    rerender();

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });
});
