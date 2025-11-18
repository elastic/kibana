/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationNameInput } from './migration_name_input';
import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';
import type { UserProfile } from '@kbn/security-plugin-types-common';
import { renderHook } from '@testing-library/react';
import type { MigrationNameStepProps } from '.';
import { useMigrationNameStep } from '.';

jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile');
const mockUseGetCurrentUserProfile = useGetCurrentUserProfile as jest.MockedFunction<
  typeof useGetCurrentUserProfile
>;

jest.mock('./migration_name_input', () => ({
  MigrationNameInput: jest.fn(),
}));
let MockMigrationNameInputComp = MigrationNameInput as unknown as jest.Mock<
  typeof MigrationNameInput
>;

const mockUser = {
  user: {
    full_name: 'John Doe',
    username: 'johndoe',
  },
} as unknown as UserProfile;

function renderTestHook(args: Partial<MigrationNameStepProps> = {}) {
  return renderHook(() =>
    useMigrationNameStep({
      status: 'incomplete',
      setMigrationName: jest.fn(),
      migrationName: undefined,
      ...args,
    })
  );
}

describe('useMigrationNameStep', () => {
  beforeEach(() => {
    MockMigrationNameInputComp = jest.fn();
    mockUseGetCurrentUserProfile.mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCurrentUserProfile>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return null in case of loading', async () => {
    mockUseGetCurrentUserProfile.mockReturnValue({
      data: mockUser,
      isLoading: true,
    } as unknown as ReturnType<typeof useGetCurrentUserProfile>);

    const { result } = renderTestHook();
    expect(result.current.children).toBeNull();

    expect(MockMigrationNameInputComp).not.toHaveBeenCalled();
  });

  it('should return username in case there is no full_name', () => {
    mockUseGetCurrentUserProfile.mockReturnValue({
      data: {
        user: {
          username: 'johndoe',
        },
      } as unknown as UserProfile,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCurrentUserProfile>);

    const { result } = renderTestHook();
    expect(result.current.children).not.toBeNull();
    expect((result.current.children as React.ReactElement).props.migrationName).toMatch(
      /^johndoe's migration on/
    );
  });

  it('should return username in case of full_name is empty string', () => {
    mockUseGetCurrentUserProfile.mockReturnValue({
      data: {
        user: {
          full_name: '',
          username: 'johndoe',
        },
      } as unknown as UserProfile,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCurrentUserProfile>);

    const { result } = renderTestHook();
    expect(result.current.children).not.toBeNull();
    expect((result.current.children as React.ReactElement).props.migrationName).toMatch(
      /^johndoe's migration on/
    );
  });

  it('should return full_name if exists', () => {
    const { result } = renderTestHook();
    expect(result.current.children).not.toBeNull();
    expect((result.current.children as React.ReactElement).props.migrationName).toMatch(
      /^John Doe's migration on/
    );
  });

  it('should return stored migration name if exists', () => {
    const { result } = renderTestHook({ migrationName: 'Stored migration name' });
    expect(result.current.children).not.toBeNull();
    expect((result.current.children as React.ReactElement).props.migrationName).toBe(
      'Stored migration name'
    );
  });

  describe('Error', () => {
    it('should return fallback name if user profile api fails', () => {
      mockUseGetCurrentUserProfile.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetCurrentUserProfile>);

      const { result } = renderTestHook();
      expect(result.current.children).not.toBeNull();
      expect((result.current.children as React.ReactElement).props.migrationName).toMatch(
        /^Migration created on/
      );
    });
  });
});
