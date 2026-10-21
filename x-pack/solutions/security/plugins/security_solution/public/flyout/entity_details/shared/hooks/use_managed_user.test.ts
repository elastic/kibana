/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useManagedUser } from './use_managed_user';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

jest.mock('../../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));
jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({ deleteQuery: jest.fn(), setQuery: jest.fn() }),
}));
jest.mock('../../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;

describe('useManagedUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: { users: {} },
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('forwards the caller-supplied executionContext to useSearchStrategy', () => {
    const executionContext = buildExecutionContext(
      EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
      'user_managed_details'
    );

    renderHook(() => useManagedUser({ executionContext }));

    expect(mockUseSearchStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:entity_details_flyout',
            id: 'user_managed_details',
          },
        },
      })
    );
  });

  it('passes no executionContext when the caller does not supply one', () => {
    renderHook(() => useManagedUser());

    const [searchArgs] = mockUseSearchStrategy.mock.calls[0];
    expect(searchArgs.executionContext).toBeUndefined();
  });
});
