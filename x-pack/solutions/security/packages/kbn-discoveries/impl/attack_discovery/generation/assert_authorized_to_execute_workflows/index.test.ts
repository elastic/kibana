/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

import { assertAuthorizedToExecuteWorkflows, WorkflowExecutionAuthorizationError } from '.';

interface Grants {
  attackDiscoveryAll: boolean;
  execute: boolean;
  read: boolean;
}

const SPACE_ID = 'space-1';

const mockRequest = {} as KibanaRequest;

const allGranted: Grants = { attackDiscoveryAll: true, execute: true, read: true };

const createMockAuthz = (grants: Grants) => {
  const authorizedByApiPrivilege: Record<string, boolean> = {
    [ATTACK_DISCOVERY_API_ACTION_ALL]: grants.attackDiscoveryAll,
    [WorkflowsManagementApiActions.execute]: grants.execute,
    [WorkflowsManagementApiActions.read]: grants.read,
  };

  const get = jest.fn((apiPrivilege: string) => `api:${apiPrivilege}`);

  const atSpace = jest.fn(async (_spaceId: string, { kibana }: { kibana: string[] }) => {
    const kibanaPrivileges = kibana.map((kibanaAction) => {
      const apiPrivilege = kibanaAction.replace(/^api:/, '');

      return {
        authorized: authorizedByApiPrivilege[apiPrivilege] ?? false,
        privilege: kibanaAction,
      };
    });

    return {
      hasAllRequested: kibanaPrivileges.every(({ authorized }) => authorized),
      privileges: { elasticsearch: { cluster: [], index: {} }, kibana: kibanaPrivileges },
      username: 'test-user',
    };
  });

  const checkPrivilegesWithRequest = jest.fn(() => ({
    atSpace,
    atSpaces: jest.fn(),
    globally: jest.fn(),
  }));

  const authz = {
    actions: { api: { get } },
    checkPrivilegesWithRequest,
  } as unknown as SecurityPluginStart['authz'];

  return { atSpace, authz, checkPrivilegesWithRequest, get };
};

describe('assertAuthorizedToExecuteWorkflows', () => {
  it('resolves when all three required privileges are granted', async () => {
    const { authz } = createMockAuthz(allGranted);

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).resolves.toBeUndefined();
  });

  it('throws when the execute privilege is missing', async () => {
    const { authz } = createMockAuthz({ ...allGranted, execute: false });

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).rejects.toThrow();
  });

  it('throws when the read privilege is missing', async () => {
    const { authz } = createMockAuthz({ ...allGranted, read: false });

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).rejects.toThrow();
  });

  it('throws when the attackDiscoveryAll privilege is missing', async () => {
    const { authz } = createMockAuthz({ ...allGranted, attackDiscoveryAll: false });

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).rejects.toThrow();
  });

  it('throws when all required privileges are missing', async () => {
    const { authz } = createMockAuthz({
      attackDiscoveryAll: false,
      execute: false,
      read: false,
    });

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).rejects.toThrow();
  });

  it('throws a WorkflowExecutionAuthorizationError when unauthorized', async () => {
    const { authz } = createMockAuthz({ ...allGranted, execute: false });

    await expect(
      assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID })
    ).rejects.toBeInstanceOf(WorkflowExecutionAuthorizationError);
  });

  it('calls checkPrivilegesWithRequest with the request', async () => {
    const { authz, checkPrivilegesWithRequest } = createMockAuthz(allGranted);

    await assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
  });

  it('calls atSpace with the provided spaceId', async () => {
    const { atSpace, authz } = createMockAuthz(allGranted);

    await assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(atSpace).toHaveBeenCalledWith(SPACE_ID, expect.anything());
  });

  it('requests the execute api privilege', async () => {
    const { authz, get } = createMockAuthz(allGranted);

    await assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(get).toHaveBeenCalledWith(WorkflowsManagementApiActions.execute);
  });

  it('requests the read api privilege', async () => {
    const { authz, get } = createMockAuthz(allGranted);

    await assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(get).toHaveBeenCalledWith(WorkflowsManagementApiActions.read);
  });

  it('requests the attackDiscoveryAll api privilege', async () => {
    const { authz, get } = createMockAuthz(allGranted);

    await assertAuthorizedToExecuteWorkflows({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(get).toHaveBeenCalledWith(ATTACK_DISCOVERY_API_ACTION_ALL);
  });
});
