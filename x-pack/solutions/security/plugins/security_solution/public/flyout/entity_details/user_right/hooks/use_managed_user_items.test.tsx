/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mockGlobalState, TestProviders, createMockStore } from '../../../../common/mock';
import { useManagedUserItems } from './use_managed_user_items';
import { mockEntraUserFields, mockOktaUserFields } from '../mocks';
import { UserAssetTableType } from '../../../../explore/users/store/model';
import React from 'react';

const mockState = {
  ...mockGlobalState,
  users: {
    ...mockGlobalState.users,
    flyout: {
      ...mockGlobalState.users.flyout,
      queries: {
        [UserAssetTableType.assetEntra]: {
          fields: ['user.id', 'user.first_name'],
        },
        [UserAssetTableType.assetOkta]: {
          fields: ['user.id', 'user.profile.first_name'],
        },
      },
    },
  },
};

const mockStore = createMockStore(mockState);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={mockStore}>{children}</TestProviders>
);

describe('useManagedUserItems', () => {
  it('returns managed user items for Entra user', () => {
    const { result } = renderHook(
      () => useManagedUserItems(UserAssetTableType.assetEntra, mockEntraUserFields),
      {
        wrapper: TestWrapper,
      }
    );

    expect(result.current).toEqual([
      {
        field: 'user.id',
        value: ['12345'],
      },
      {
        field: 'user.first_name',
        value: ['Entra first name'],
      },
    ]);
  });

  it('returns managed user items for Okta user', () => {
    const { result } = renderHook(
      () => useManagedUserItems(UserAssetTableType.assetOkta, mockOktaUserFields),
      {
        wrapper: TestWrapper,
      }
    );

    expect(result.current).toEqual([
      {
        field: 'user.id',
        value: ['00ud9ohoh9ww644Px5d7'],
      },
      {
        field: 'user.profile.first_name',
        value: ['Okta first name'],
      },
    ]);
  });
});
