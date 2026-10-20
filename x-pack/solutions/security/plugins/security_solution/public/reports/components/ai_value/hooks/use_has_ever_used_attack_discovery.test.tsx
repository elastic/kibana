/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasEverUsedAttackDiscovery } from './use_has_ever_used_attack_discovery';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';

const mockedUseKibana = {
  ...mockUseKibana(),
};

jest.mock('../../../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => mockedUseKibana,
}));
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => ({
    assistantAvailability: { isAssistantEnabled: true },
  }),
}));

const mockedUseFindAttackDiscoveries = useFindAttackDiscoveries as jest.MockedFunction<
  typeof useFindAttackDiscoveries
>;

describe('useHasEverUsedAttackDiscovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queries with no date range (all-time) and includes all statuses', () => {
    mockedUseFindAttackDiscoveries.mockReturnValue({
      data: { total: 0 },
      isLoading: false,
    } as ReturnType<typeof useFindAttackDiscoveries>);

    renderHook(() => useHasEverUsedAttackDiscovery());

    expect(mockedUseFindAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        isAssistantEnabled: true,
        perPage: 1,
        status: ['open', 'acknowledged', 'closed'],
      })
    );
    const [callArgs] = mockedUseFindAttackDiscoveries.mock.calls[0];
    expect(callArgs).not.toHaveProperty('start');
    expect(callArgs).not.toHaveProperty('end');
  });

  it('disables the query when enabled is false', () => {
    mockedUseFindAttackDiscoveries.mockReturnValue({
      data: { total: 7 },
      isLoading: true,
    } as ReturnType<typeof useFindAttackDiscoveries>);

    const { result } = renderHook(() => useHasEverUsedAttackDiscovery({ enabled: false }));

    expect(mockedUseFindAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        isAssistantEnabled: false,
      })
    );
    expect(result.current.hasEverUsedAttackDiscovery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns hasEverUsedAttackDiscovery=false when total is 0', () => {
    mockedUseFindAttackDiscoveries.mockReturnValue({
      data: { total: 0 },
      isLoading: false,
    } as ReturnType<typeof useFindAttackDiscoveries>);

    const { result } = renderHook(() => useHasEverUsedAttackDiscovery());

    expect(result.current.hasEverUsedAttackDiscovery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns hasEverUsedAttackDiscovery=true when total is greater than 0', () => {
    mockedUseFindAttackDiscoveries.mockReturnValue({
      data: { total: 7 },
      isLoading: false,
    } as ReturnType<typeof useFindAttackDiscoveries>);

    const { result } = renderHook(() => useHasEverUsedAttackDiscovery());

    expect(result.current.hasEverUsedAttackDiscovery).toBe(true);
  });

  it('propagates the loading state', () => {
    mockedUseFindAttackDiscoveries.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useFindAttackDiscoveries>);

    const { result } = renderHook(() => useHasEverUsedAttackDiscovery());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasEverUsedAttackDiscovery).toBe(false);
  });
});
