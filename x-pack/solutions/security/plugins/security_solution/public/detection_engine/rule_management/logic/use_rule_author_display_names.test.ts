/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useRuleAuthorDisplayNames } from './use_rule_author_display_names';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../../common/components/user_profiles/use_bulk_get_user_profiles');

const mockUseBulkGetUserProfiles = useBulkGetUserProfiles as jest.Mock;

describe('useRuleAuthorDisplayNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkGetUserProfiles.mockReturnValue({ data: [] });
  });

  it('resolves both profile uids to display names', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [
        { uid: 'created-uid', user: { username: 'creator', full_name: 'Rule Creator' } },
        { uid: 'updated-uid', user: { username: 'updater', email: 'updater@elastic.co' } },
      ],
    });

    const { result } = renderHook(() =>
      useRuleAuthorDisplayNames({
        createdBy: '1234567890',
        createdByProfileUid: 'created-uid',
        updatedBy: '0987654321',
        updatedByProfileUid: 'updated-uid',
      })
    );

    expect(result.current).toEqual({
      createdBy: 'Rule Creator',
      updatedBy: 'updater@elastic.co',
    });
  });

  it('requests both profile uids in a single bulk get', () => {
    renderHook(() =>
      useRuleAuthorDisplayNames({
        createdBy: '1234567890',
        createdByProfileUid: 'created-uid',
        updatedBy: '0987654321',
        updatedByProfileUid: 'updated-uid',
      })
    );

    expect(mockUseBulkGetUserProfiles).toHaveBeenCalledTimes(1);
    expect(mockUseBulkGetUserProfiles).toHaveBeenCalledWith({
      uids: new Set(['created-uid', 'updated-uid']),
    });
  });

  it('falls back to the raw values when the profiles cannot be resolved', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useRuleAuthorDisplayNames({
        createdBy: '1234567890',
        createdByProfileUid: 'created-uid',
        updatedBy: '0987654321',
        updatedByProfileUid: 'updated-uid',
      })
    );

    expect(result.current).toEqual({
      createdBy: '1234567890',
      updatedBy: '0987654321',
    });
  });

  it('returns the raw values when there are no profile uids', () => {
    const { result } = renderHook(() =>
      useRuleAuthorDisplayNames({
        createdBy: 'elastic',
        updatedBy: 'elastic',
      })
    );

    expect(mockUseBulkGetUserProfiles).toHaveBeenCalledWith({ uids: new Set() });
    expect(result.current).toEqual({
      createdBy: 'elastic',
      updatedBy: 'elastic',
    });
  });

  it('resolves each author independently', () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [{ uid: 'updated-uid', user: { username: 'updater', full_name: 'Rule Updater' } }],
    });

    const { result } = renderHook(() =>
      useRuleAuthorDisplayNames({
        createdBy: 'elastic',
        updatedBy: '0987654321',
        updatedByProfileUid: 'updated-uid',
      })
    );

    expect(result.current).toEqual({
      createdBy: 'elastic',
      updatedBy: 'Rule Updater',
    });
  });
});
