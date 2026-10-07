/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementApiActions } from '@kbn/workflows';

import { getMissingWorkflowsPrivileges } from '.';

interface Grants {
  execute: boolean;
  read: boolean;
}

const SPACE_ID = 'space-1';

const mockRequest = {} as KibanaRequest;

const allGranted: Grants = { execute: true, read: true };

const createMockAuthz = (grants: Grants) => {
  const authorizedByApiPrivilege: Record<string, boolean> = {
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

describe('getMissingWorkflowsPrivileges', () => {
  it('returns an empty array when both workflows privileges are granted', async () => {
    const { authz } = createMockAuthz(allGranted);

    const result = await getMissingWorkflowsPrivileges({
      authz,
      request: mockRequest,
      spaceId: SPACE_ID,
    });

    expect(result).toEqual([]);
  });

  it('reports the read privilege as missing when only read is absent', async () => {
    const { authz } = createMockAuthz({ ...allGranted, read: false });

    const result = await getMissingWorkflowsPrivileges({
      authz,
      request: mockRequest,
      spaceId: SPACE_ID,
    });

    expect(result).toEqual([{ feature_id: WORKFLOWS_MANAGEMENT_FEATURE_ID, privileges: ['read'] }]);
  });

  it('reports the execute privilege as missing when only execute is absent', async () => {
    const { authz } = createMockAuthz({ ...allGranted, execute: false });

    const result = await getMissingWorkflowsPrivileges({
      authz,
      request: mockRequest,
      spaceId: SPACE_ID,
    });

    expect(result).toEqual([
      { feature_id: WORKFLOWS_MANAGEMENT_FEATURE_ID, privileges: ['execute'] },
    ]);
  });

  it('reports both privileges as missing when neither is granted', async () => {
    const { authz } = createMockAuthz({ execute: false, read: false });

    const result = await getMissingWorkflowsPrivileges({
      authz,
      request: mockRequest,
      spaceId: SPACE_ID,
    });

    expect(result).toEqual([
      { feature_id: WORKFLOWS_MANAGEMENT_FEATURE_ID, privileges: ['read', 'execute'] },
    ]);
  });

  it('checks privileges for the provided request', async () => {
    const { authz, checkPrivilegesWithRequest } = createMockAuthz(allGranted);

    await getMissingWorkflowsPrivileges({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
  });

  it('checks privileges at the provided spaceId', async () => {
    const { atSpace, authz } = createMockAuthz(allGranted);

    await getMissingWorkflowsPrivileges({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(atSpace).toHaveBeenCalledWith(SPACE_ID, expect.anything());
  });

  it('requests the read api privilege', async () => {
    const { authz, get } = createMockAuthz(allGranted);

    await getMissingWorkflowsPrivileges({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(get).toHaveBeenCalledWith(WorkflowsManagementApiActions.read);
  });

  it('requests the execute api privilege', async () => {
    const { authz, get } = createMockAuthz(allGranted);

    await getMissingWorkflowsPrivileges({ authz, request: mockRequest, spaceId: SPACE_ID });

    expect(get).toHaveBeenCalledWith(WorkflowsManagementApiActions.execute);
  });
});
