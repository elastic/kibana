/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { EuiStepStatus } from '@elastic/eui';
import { useCheckResourcesStep } from '.';
import { TestProviders } from '../../../../../../../common/mock';
import { useGetMissingResources } from '../../../../../../common/hooks/use_get_missing_resources';
import { getDashboardMigrationStatsMock } from '../../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';

jest.mock('../../../../../../common/hooks/use_get_missing_resources');
const mockUseGetMissingResources = useGetMissingResources as jest.Mock;

describe('useCheckResourcesStep', () => {
  const mockGetMissingResources = jest.fn();
  const onMissingResourcesFetched = jest.fn();

  const defaultProps = {
    status: 'incomplete' as EuiStepStatus,
    migrationStats: getDashboardMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    onMissingResourcesFetched,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns step props', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: mockGetMissingResources,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCheckResourcesStep(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'incomplete',
      title: 'Check for macros and lookups',
    });
  });

  it('returns loading status', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: mockGetMissingResources,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useCheckResourcesStep(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'loading',
      title: 'Check for macros and lookups',
    });
  });

  it('returns danger status on error', () => {
    const error = new Error('test error');
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: mockGetMissingResources,
      isLoading: false,
      error,
    });

    const { result } = renderHook(() => useCheckResourcesStep(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'danger',
      title: 'Check for macros and lookups',
    });
  });

  it('calls getMissingResources when status is current', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: mockGetMissingResources,
      isLoading: false,
      error: null,
    });

    const { rerender } = renderHook((props) => useCheckResourcesStep(props), {
      initialProps: defaultProps,
      wrapper: TestProviders,
    });

    rerender({ ...defaultProps, status: 'current' });

    expect(mockGetMissingResources).toHaveBeenCalledWith(defaultProps.migrationStats.id);
  });

  it('does not call getMissingResources when migrationStats is undefined', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: mockGetMissingResources,
      isLoading: false,
      error: null,
    });

    renderHook(
      () =>
        useCheckResourcesStep({
          ...defaultProps,
          status: 'current',
          migrationStats: undefined,
        }),
      { wrapper: TestProviders }
    );

    expect(mockGetMissingResources).not.toHaveBeenCalled();
  });

  it('calls onMissingResourcesFetched with the result of getMissingResources', async () => {
    const missingResources = { lookups: ['a'], macros: ['b'] };
    mockGetMissingResources.mockResolvedValue(missingResources);
    mockUseGetMissingResources.mockImplementation((_, onFetched) => {
      return {
        getMissingResources: async (id: string) => {
          const result = await mockGetMissingResources(id);
          onFetched(result);
        },
        isLoading: false,
        error: null,
      };
    });

    await act(async () => {
      renderHook(() => useCheckResourcesStep({ ...defaultProps, status: 'current' }), {
        wrapper: TestProviders,
      });
    });

    expect(onMissingResourcesFetched).toHaveBeenCalledWith(missingResources);
  });
});
