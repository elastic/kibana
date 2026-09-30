/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { createSandboxToolAvailability } from './sandbox_tool_availability';

const setup = ({
  enabled = true,
  withSecurity = true,
  useRbac = true,
  hasManagePrivilege = true,
}: {
  enabled?: boolean;
  withSecurity?: boolean;
  useRbac?: boolean;
  hasManagePrivilege?: boolean;
} = {}) => {
  const { featureFlags } = coreMock.createStart();
  featureFlags.getBooleanValue.mockResolvedValue(enabled);
  const checkPrivileges = jest.fn(async () => ({ hasAllRequested: hasManagePrivilege }));
  const security = {
    authz: {
      mode: { useRbacForRequest: jest.fn(() => useRbac) },
      checkPrivilegesDynamicallyWithRequest: jest.fn(() => checkPrivileges),
      actions: { api: { get: (operation: string) => `api:${operation}` } },
    },
  } as unknown as SecurityPluginStart;

  const { handler } = createSandboxToolAvailability({
    getDeps: () => ({ featureFlags, security: withSecurity ? security : undefined }),
  });
  const check = () =>
    handler({
      request: httpServerMock.createKibanaRequest(),
      uiSettings: uiSettingsServiceMock.createClient(),
      spaceId: 'default',
    });

  return { check, featureFlags, checkPrivileges };
};

describe('createSandboxToolAvailability', () => {
  it('is available with the flag on and the Nightshift manage privilege', async () => {
    const { check, featureFlags, checkPrivileges } = setup();

    await expect(check()).resolves.toEqual({ status: 'available' });
    expect(featureFlags.getBooleanValue).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.manage}`],
    });
  });

  it('is unavailable while the flag is off', async () => {
    const { check, checkPrivileges } = setup({ enabled: false });

    await expect(check()).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  it('is unavailable without the Nightshift manage privilege', async () => {
    const { check } = setup({ hasManagePrivilege: false });

    await expect(check()).resolves.toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('manage privilege'),
    });
  });

  it('is unavailable when the security plugin is missing', async () => {
    const { check } = setup({ withSecurity: false });

    await expect(check()).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
  });

  it('skips the privilege check when RBAC does not apply to the request', async () => {
    const { check, checkPrivileges } = setup({ useRbac: false, hasManagePrivilege: false });

    await expect(check()).resolves.toEqual({ status: 'available' });
    expect(checkPrivileges).not.toHaveBeenCalled();
  });
});
