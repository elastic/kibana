/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMissingPrivileges } from './use_missing_privileges';
import { useUserPrivileges } from '../components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../components/user_privileges/__mocks__';
import { RULES_FEATURE_ID } from '../../../common/constants';

jest.mock('../components/user_privileges');
jest.mock('../../detections/components/user_info');

const detectionEnginePrivileges = {
  username: 'elastic',
  has_all_requested: true,
  cluster: {
    all: true,
  },
  index: {
    '.alerts-security.alerts-default': {
      all: true,
      create: true,
      read: true,
      write: true,
    },
  },
  application: {},
  is_authenticated: true,
  has_encryption_key: true,
};

const listPrivileges = {
  is_authenticated: true,
  lists: {
    username: 'elastic',
    has_all_requested: true,
    cluster: {
      all: true,
    },
    index: {
      '.lists-default': {
        all: true,
        create: true,
        read: true,
        write: true,
      },
    },
    application: {},
  },
  listItems: {
    username: 'elastic',
    has_all_requested: true,
    cluster: {
      all: true,
    },
    index: {
      '.items-default': {
        all: true,
        create: true,
        read: true,
        write: true,
      },
    },
    application: {},
  },
};

type UseUserPrivilegesReturn = ReturnType<typeof useUserPrivileges>;

const buildUseUserPrivilegesMockReturn = (
  overrides: Partial<UseUserPrivilegesReturn> = {}
): UseUserPrivilegesReturn => ({
  ...getUserPrivilegesMockDefaultValue(),
  detectionEnginePrivileges: {
    // @ts-expect-error partial mock
    result: detectionEnginePrivileges,
  },
  listPrivileges: {
    // @ts-expect-error partial mock
    result: listPrivileges,
  },
  ...overrides,
});

describe('useMissingPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useUserPrivileges as jest.Mock).mockReturnValue(buildUseUserPrivilegesMockReturn());
  });

  it('reports no privileges missing while detectionEnginePrivileges result is null', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue(
      buildUseUserPrivilegesMockReturn({
        detectionEnginePrivileges: {
          // @ts-expect-error partial mock
          result: null,
        },
      })
    );

    const hookResult = renderHook(() => useMissingPrivileges());
    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [],
    });
  });

  it('reports missing rulesPrivileges if user cannot edit rules', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue(
      buildUseUserPrivilegesMockReturn({
        rulesPrivileges: {
          rules: { edit: false, read: true },
          exceptions: { edit: false, read: true },
        },
      })
    );

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual(
      expect.objectContaining({
        featurePrivileges: expect.arrayContaining([[RULES_FEATURE_ID, ['all']]]),
      })
    );
  });

  it('reports no privileges missing while listPrivileges result is null', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue(
      buildUseUserPrivilegesMockReturn({
        listPrivileges: {
          // @ts-expect-error partial mock
          result: null,
        },
      })
    );

    const hookResult = renderHook(() => useMissingPrivileges());
    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [],
    });
  });

  it('reports missing "all" privilege for security if user does not have CRUD', () => {
    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current.featurePrivileges).toEqual(
      expect.arrayContaining([[RULES_FEATURE_ID, ['all']]])
    );
  });

  it('reports no missing rule privileges if user can edit rules', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue(
      buildUseUserPrivilegesMockReturn({
        rulesPrivileges: {
          rules: { edit: true, read: true },
          exceptions: { edit: true, read: true },
        },
      })
    );

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current.featurePrivileges).toEqual([]);
  });

  it('reports complex index privileges when all data is available', () => {
    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual({
      featurePrivileges: [[RULES_FEATURE_ID, ['all']]],
      indexPrivileges: [
        ['.items-default', ['view_index_metadata', 'manage']],
        ['.lists-default', ['view_index_metadata', 'manage']],
        ['.alerts-security.alerts-default', ['view_index_metadata', 'manage']],
      ],
    });
  });
});
