/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPrivileges } from '../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useCheckEndpointPermissions } from './check_permissions';
jest.mock('../../../common/components/user_privileges');

const usePrivilegesMock = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;

const mockPrivileges = (config: Partial<EndpointPrivileges>) => {
  usePrivilegesMock.mockReturnValue({
    // @ts-expect-error missing some values that are not required for testing purposes
    endpointPrivileges: config,
  });
};

describe('useCheckEndpointPermissions', () => {
  const action = {
    actionTypeId: '.endpoint' as const,
    params: {
      command: 'isolate' as const,
      comment: 'test',
    },
  };
  describe('with privileges', () => {
    beforeAll(() => {
      mockPrivileges({
        loading: false,
        canIsolateHost: true,
        canUnIsolateHost: true,
        canKillProcess: true,
        canSuspendProcess: true,
      });
    });
    it('returns false when user has privileges for isolate', () => {
      const result = useCheckEndpointPermissions(action);

      expect(result).toBe(false);
    });
    it('returns false when user has privileges for kill-process', () => {
      const result = useCheckEndpointPermissions({
        ...action,
        params: { command: 'kill-process', config: { overwrite: true, field: '' } },
      });

      expect(result).toBe(false);
    });

    it('returns undefined when actionTypeId is not a registered action', () => {
      const result = useCheckEndpointPermissions({
        ...action,
        // @ts-expect-error wrong value just for testing purposes
        actionTypeId: 'notEndpoint',
      });

      expect(result).toBe(undefined);
    });
  });

  describe('without privileges', () => {
    beforeEach(() => {
      mockPrivileges({
        loading: false,
        canIsolateHost: false,
        canUnIsolateHost: false,
        canKillProcess: false,
        canSuspendProcess: false,
      });
    });

    it('return true if user has no privilege to execute a command', () => {
      const result = useCheckEndpointPermissions(action);

      expect(result).toBe(true);
    });

    it('returns false when action is not endpoint command', () => {
      const result = useCheckEndpointPermissions({
        ...action,
        // @ts-expect-error wrong value just for testing purposes
        actionTypeId: 'notEndpoint',
      });
      expect(result).toBe(undefined);
    });
  });
});
