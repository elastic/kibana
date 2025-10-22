/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMissingPrivileges } from './use_missing_privileges';
import { useUserPrivileges } from '../components/user_privileges';
import { useUserData } from '../../detections/components/user_info';
import { SECURITY_FEATURE_ID } from '../../../common';

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

describe('useMissingPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty arrays if canUserCRUD is null', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      detectionEnginePrivileges: {
        result: detectionEnginePrivileges,
      },
      listPrivileges: {
        result: listPrivileges,
      },
    });
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: null }]);

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [],
    });
  });

  it('should return empty arrays if detectionEnginePrivileges result is null', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      detectionEnginePrivileges: {
        result: null,
      },
      listPrivileges: {
        result: listPrivileges,
      },
    });
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: true }]);

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [],
    });
  });

  it('should return empty arrays if listPrivileges result is null', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      detectionEnginePrivileges: {
        result: detectionEnginePrivileges,
      },
      listPrivileges: {
        result: null,
      },
    });
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: true }]);

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [],
    });
  });

  it('should return featurePrivileges security feature all if user does not have CRUD', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      detectionEnginePrivileges: {
        result: detectionEnginePrivileges,
      },
      listPrivileges: {
        result: listPrivileges,
      },
    });
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: false }]);

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current.featurePrivileges).toEqual([[SECURITY_FEATURE_ID, ['all']]]);
  });

  it('should return featurePrivileges and indexPrivileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      detectionEnginePrivileges: {
        result: detectionEnginePrivileges,
      },
      listPrivileges: {
        result: listPrivileges,
      },
    });
    (useUserData as jest.Mock).mockReturnValue([{ canUserCRUD: true }]);

    const hookResult = renderHook(() => useMissingPrivileges());

    expect(hookResult.result.current).toEqual({
      featurePrivileges: [],
      indexPrivileges: [
        ['.items-default', ['view_index_metadata', 'manage']],
        ['.lists-default', ['view_index_metadata', 'manage']],
        ['.alerts-security.alerts-default', ['view_index_metadata', 'manage']],
      ],
    });
  });
});
