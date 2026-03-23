/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMacrosFileUploadStep } from '.';
import { TestProviders } from '../../../../../../../../common/mock';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import { getDashboardMigrationStatsMock } from '../../../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../../../../../../common/types';

jest.mock('../../../../../../service/hooks/use_upsert_resources');
const mockUseUpsertResources = useUpsertResources as jest.Mock;

describe('useMacrosFileUploadStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns step props', () => {
    mockUseUpsertResources.mockReturnValue({
      upsertResources: jest.fn(),
      isLoading: false,
      error: null,
    });

    const props = {
      status: 'incomplete' as const,
      migrationStats: getDashboardMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
      migrationSource: MigrationSource.SPLUNK,
      missingMacros: [],
      onMacrosCreated: jest.fn(),
    };
    const { result } = renderHook(() => useMacrosFileUploadStep(props), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'incomplete',
      title: 'Upload exported macros',
    });
  });

  it('returns step props with `loading` status', () => {
    mockUseUpsertResources.mockReturnValue({
      upsertResources: jest.fn(),
      isLoading: true,
      error: null,
    });

    const props = {
      status: 'incomplete' as const,
      migrationStats: getDashboardMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
      migrationSource: MigrationSource.SPLUNK,
      missingMacros: [],
      onMacrosCreated: jest.fn(),
    };
    const { result } = renderHook(() => useMacrosFileUploadStep(props), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'loading',
      title: 'Upload exported macros',
    });
  });

  it('returns step props with `danger` status', () => {
    mockUseUpsertResources.mockReturnValue({
      upsertResources: jest.fn(),
      isLoading: false,
      error: new Error('Test failure!'),
    });

    const props = {
      status: 'incomplete' as const,
      migrationStats: getDashboardMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
      migrationSource: MigrationSource.SPLUNK,
      missingMacros: [],
      onMacrosCreated: jest.fn(),
    };
    const { result } = renderHook(() => useMacrosFileUploadStep(props), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'danger',
      title: 'Upload exported macros',
    });
  });
});
