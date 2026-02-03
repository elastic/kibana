/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import produce from 'immer';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { Privilege } from './types';
import { useAlertsPrivileges } from './use_alerts_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../common/components/user_privileges/endpoint/mocks';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock<ReturnType<typeof useUserPrivileges>>;

const privilege: Privilege = {
  username: 'soc_manager',
  has_all_requested: false,
  cluster: {
    monitor_ml: false,
    manage_index_templates: false,
    monitor_transform: false,
    manage_api_key: false,
    manage_security: false,
    manage_own_api_key: false,
    all: false,
    monitor: false,
    manage: true,
    manage_transform: false,
    manage_ml: false,
    manage_pipeline: false,
  },
  index: {
    '.siem-signals-default': {
      all: false,
      read: true,
      create_index: true,
      index: true,
      monitor: true,
      delete: true,
      manage: true,
      delete_index: true,
      create_doc: true,
      view_index_metadata: true,
      create: true,
      maintenance: true,
      write: true,
    },
  },
  application: {},
  is_authenticated: true,
  has_encryption_key: true,
};

const userPrivilegesInitial: ReturnType<typeof useUserPrivileges> = {
  detectionEnginePrivileges: {
    loading: false,
    result: undefined,
    error: undefined,
  },
  listPrivileges: {
    loading: false,
    result: undefined,
    error: undefined,
  },
  endpointPrivileges: getEndpointPrivilegesInitialStateMock({
    loading: true,
    canAccessEndpointManagement: false,
    canAccessFleet: false,
  }),
  siemPrivileges: { crud: true, read: true },
  timelinePrivileges: { crud: true, read: true },
  notesPrivileges: { crud: true, read: true },
  rulesPrivileges: { rules: { edit: true, read: true }, exceptions: { read: true, edit: false } },
};

describe('useAlertsPrivileges', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    useUserPrivilegesMock.mockReturnValue(userPrivilegesInitial);
  });

  test('init', async () => {
    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexRead: null,
        hasIndexMaintenance: null,
        hasIndexWrite: null,
        hasIndexUpdateDelete: null,
        hasAlertsRead: false,
        hasAlertsAll: false,
        isAuthenticated: null,
        loading: false,
      })
    );
  });

  test('if there is an error when fetching user privilege, we should get back false for all index related properties', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.error = new Error('Something went wrong');
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);
    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: false,
        hasIndexManage: false,
        hasIndexMaintenance: false,
        hasIndexRead: false,
        hasIndexWrite: false,
        hasIndexUpdateDelete: false,
        hasAlertsRead: true,
        hasAlertsAll: true,
        isAuthenticated: false,
        loading: false,
      })
    );
  });

  test('returns "hasIndexManage" is false if the privilege does not have cluster manage', async () => {
    const privilegeWithClusterManage = produce(privilege, (draft) => {
      draft.cluster.manage = false;
    });
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilegeWithClusterManage;
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: false,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        hasAlertsRead: true,
        hasAlertsAll: true,
        isAuthenticated: true,
        loading: false,
      })
    );
  });

  test('returns "hasIndexManage" is true if the privilege has cluster manage', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilege;
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        hasAlertsRead: true,
        hasAlertsAll: true,
        isAuthenticated: true,
        loading: false,
      })
    );
  });

  test('returns "hasAlertsAll" as false if user does not have SecurityRules "all" privilege', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilege;
      draft.rulesPrivileges = {
        rules: { edit: false, read: true },
        exceptions: { read: true, edit: false },
      };
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        hasAlertsAll: false,
        hasAlertsRead: true,
        isAuthenticated: true,
        loading: false,
      })
    );
  });

  test('returns "hasAlertsRead" as false if user does not have the SecurityRules "read" privileges', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilege;
      draft.rulesPrivileges = {
        rules: { edit: false, read: false },
        exceptions: { read: false, edit: false },
      };
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    const { result } = renderHook(() => useAlertsPrivileges());
    await waitFor(() =>
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        hasAlertsAll: false,
        hasAlertsRead: false,
        isAuthenticated: true,
        loading: false,
      })
    );
  });
});
