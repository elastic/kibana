/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRulesFileUploadStep } from '.';
import { TestProviders } from '../../../../../../../../common/mock';
import { useCreateMigration } from '../../../../../../service/hooks/use_create_migration';
import { MigrationSource } from '../../../../../../../common/types';

jest.mock('../../../../../../service/hooks/use_create_migration', () => ({
  useCreateMigration: jest.fn(),
}));

describe('useRulesFileUploadStep', () => {
  const mockUseCreateMigration = useCreateMigration as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns step props with incomplete status', () => {
    mockUseCreateMigration.mockReturnValue({
      createMigration: jest.fn(),
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(
      () =>
        useRulesFileUploadStep({
          status: 'incomplete',
          migrationStats: undefined,
          migrationName: 'test',
          onMigrationCreated: jest.fn(),
          onRulesFileChanged: jest.fn(),
          migrationSource: MigrationSource.SPLUNK,
        }),
      { wrapper: TestProviders }
    );

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'incomplete',
      title: 'Update exported rules',
    });
  });

  it('returns step props with loading status', () => {
    mockUseCreateMigration.mockReturnValue({
      createMigration: jest.fn(),
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(
      () =>
        useRulesFileUploadStep({
          status: 'incomplete',
          migrationStats: undefined,
          migrationName: 'test',
          onMigrationCreated: jest.fn(),
          onRulesFileChanged: jest.fn(),
          migrationSource: MigrationSource.SPLUNK,
        }),
      { wrapper: TestProviders }
    );

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'loading',
      title: 'Update exported rules',
    });
  });

  it('returns step props with danger status on error', () => {
    mockUseCreateMigration.mockReturnValue({
      createMigration: jest.fn(),
      isLoading: false,
      error: new Error('test error'),
    });

    const { result } = renderHook(
      () =>
        useRulesFileUploadStep({
          status: 'incomplete',
          migrationStats: undefined,
          migrationName: 'test',
          onMigrationCreated: jest.fn(),
          onRulesFileChanged: jest.fn(),
          migrationSource: MigrationSource.SPLUNK,
        }),
      { wrapper: TestProviders }
    );

    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'danger',
      title: 'Update exported rules',
    });
  });
});
