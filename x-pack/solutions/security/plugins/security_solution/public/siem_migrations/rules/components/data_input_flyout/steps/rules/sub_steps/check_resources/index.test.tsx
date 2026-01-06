/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { useCheckResourcesStep } from '.';
import { TestProviders } from '../../../../../../../../common/mock';
import { useGetMissingResources } from '../../../../../../../common/hooks/use_get_missing_resources';
import { getRuleMigrationStatsMock } from '../../../../../../__mocks__';
import { MigrationSource } from '../../../../../../../common/types';

jest.mock('../../../../../../../common/hooks/use_get_missing_resources');

const mockUseGetMissingResources = useGetMissingResources as jest.Mock;

const mockMigrationStats = getRuleMigrationStatsMock({ id: 'test-id' });

describe('useCheckResourcesStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns step props with "current" status and calls getMissingResources', async () => {
    const getMissingResources = jest.fn();
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(
      () =>
        useCheckResourcesStep({
          status: 'current',
          migrationStats: mockMigrationStats,
          onMissingResourcesFetched: jest.fn(),
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.status).toBe('current');
    expect(result.current.title).toBe('Check for macros and lookups');

    const { getByTestId } = render(result.current.children as React.ReactElement);
    expect(getByTestId('checkResourcesDescription')).toHaveTextContent(
      'For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.'
    );

    await waitFor(() => {
      expect(getMissingResources).toHaveBeenCalledWith('test-id');
    });
  });

  it('returns step props with "loading" status', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: jest.fn(),
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(
      () =>
        useCheckResourcesStep({
          status: 'current',
          migrationStats: mockMigrationStats,
          onMissingResourcesFetched: jest.fn(),
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.status).toBe('loading');
  });

  it('returns step props with "danger" status on error', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources: jest.fn(),
      isLoading: false,
      error: new Error('test error'),
    });

    const { result } = renderHook(
      () =>
        useCheckResourcesStep({
          status: 'current',
          migrationStats: mockMigrationStats,
          onMissingResourcesFetched: jest.fn(),
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.status).toBe('danger');
  });

  it('does not call getMissingResources when status is not "current"', () => {
    const getMissingResources = jest.fn();
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources,
      isLoading: false,
      error: null,
    });

    renderHook(
      () =>
        useCheckResourcesStep({
          status: 'incomplete',
          migrationStats: mockMigrationStats,
          onMissingResourcesFetched: jest.fn(),
        }),
      { wrapper: TestProviders }
    );

    expect(getMissingResources).not.toHaveBeenCalled();
  });

  it('returns reference sets content', () => {
    const getMissingResources = jest.fn();
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(
      () =>
        useCheckResourcesStep({
          status: 'incomplete',
          migrationStats: mockMigrationStats,
          onMissingResourcesFetched: jest.fn(),
          migrationSource: MigrationSource.QRADAR,
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.title).toEqual('Check for reference sets');
  });
});
