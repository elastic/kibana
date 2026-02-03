/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import { transformCustomScriptsToOptions, checkActionCancelPermission } from './utils';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';

describe('utils', () => {
  describe('transformCustomScriptsToOptions', () => {
    const mockScript: ResponseActionScript = {
      id: 'script-1',
      name: 'Test Script',
      description: 'A test script for validation',
    };

    it('should transform scripts to options correctly', () => {
      const result = transformCustomScriptsToOptions([mockScript]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'Test Script',
        description: 'A test script for validation',
        data: mockScript,
        checked: undefined,
      });
    });

    it('should mark selected script as checked', () => {
      const result = transformCustomScriptsToOptions([mockScript], 'Test Script');

      expect(result[0]).toMatchObject({
        label: 'Test Script',
        checked: 'on',
      });
    });

    it('should handle empty scripts array', () => {
      const result = transformCustomScriptsToOptions([]);
      expect(result).toEqual([]);
    });
  });

  describe('checkActionCancelPermission', () => {
    const mockEndpointPrivileges: EndpointAuthz = getEndpointAuthzInitialStateMock();

    describe('with valid permissions', () => {
      test('returns canCancel: true for isolate command when user has canIsolateHost permission', () => {
        const result = checkActionCancelPermission('isolate', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for unisolate command when user has canUnIsolateHost permission', () => {
        const result = checkActionCancelPermission('unisolate', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for kill-process command when user has canKillProcess permission', () => {
        const result = checkActionCancelPermission('kill-process', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for execute command when user has canWriteExecuteOperations permission', () => {
        const result = checkActionCancelPermission('execute', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });
    });

    describe('without required permissions', () => {
      test('returns canCancel: false for isolate command when user lacks canIsolateHost permission', () => {
        const privilegesWithoutIsolate = {
          ...mockEndpointPrivileges,
          canIsolateHost: false,
        };

        const result = checkActionCancelPermission('isolate', privilegesWithoutIsolate);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run isolate action");
      });

      test('returns canCancel: false for kill-process command when user lacks canKillProcess permission', () => {
        const privilegesWithoutKillProcess = {
          ...mockEndpointPrivileges,
          canKillProcess: false,
        };

        const result = checkActionCancelPermission('kill-process', privilegesWithoutKillProcess);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run kill-process action");
      });

      test('returns canCancel: false for get-file command when user lacks canWriteFileOperations permission', () => {
        const privilegesWithoutFileOps = {
          ...mockEndpointPrivileges,
          canWriteFileOperations: false,
        };

        const result = checkActionCancelPermission('get-file', privilegesWithoutFileOps);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run get-file action");
      });
    });

    describe('with unknown commands', () => {
      test('returns canCancel: false for unknown command', () => {
        const result = checkActionCancelPermission('unknown-command', mockEndpointPrivileges);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run unknown-command action.");
      });
    });
  });
});
