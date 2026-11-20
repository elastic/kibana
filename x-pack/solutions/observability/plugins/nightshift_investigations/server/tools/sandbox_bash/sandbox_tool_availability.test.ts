/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock, httpServerMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  checkSandboxAccess,
  createSandboxToolAvailability,
  SANDBOX_ACCESS_CACHE_TTL_MS,
} from './sandbox_tool_availability';

const setup = ({
  enabled = true,
  withSecurity = true,
  useRbac = true,
  hasManagePrivilege = true,
  spaceId = 'default',
}: {
  enabled?: boolean;
  withSecurity?: boolean;
  useRbac?: boolean;
  hasManagePrivilege?: boolean;
  /** Space the request targets; the space Nightshift runs in unless a test overrides it. */
  spaceId?: string;
} = {}) => {
  const { featureFlags } = coreMock.createStart();
  featureFlags.getBooleanValue$.mockReturnValue(of(enabled));
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
      spaceId,
    });

  return { check, featureFlags, checkPrivileges };
};

describe('createSandboxToolAvailability', () => {
  it('is available with the flag on and the Nightshift manage privilege', async () => {
    const { check, featureFlags, checkPrivileges } = setup();

    await expect(check()).resolves.toEqual({ status: 'available' });
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.manage}`],
    });
  });

  it('is unavailable outside the space Nightshift runs in', async () => {
    const { check, featureFlags, checkPrivileges } = setup({ spaceId: 'marketing' });

    await expect(check()).resolves.toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('default'),
    });
    expect(featureFlags.getBooleanValue$).not.toHaveBeenCalled();
    expect(checkPrivileges).not.toHaveBeenCalled();
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

  describe('per-request reuse', () => {
    const createAvailability = () => {
      const { featureFlags } = coreMock.createStart();
      featureFlags.getBooleanValue$.mockReturnValue(of(true));
      const checkPrivileges = jest.fn(async () => ({ hasAllRequested: true }));
      const security = {
        authz: {
          mode: { useRbacForRequest: () => true },
          checkPrivilegesDynamicallyWithRequest: () => checkPrivileges,
          actions: { api: { get: (operation: string) => `api:${operation}` } },
        },
      } as unknown as SecurityPluginStart;
      let time = 0;
      const { handler } = createSandboxToolAvailability({
        getDeps: () => ({ featureFlags, security }),
        now: () => time,
      });
      const uiSettings = uiSettingsServiceMock.createClient();
      const check = (request = httpServerMock.createKibanaRequest(), spaceId = 'default') =>
        handler({ request, uiSettings, spaceId });
      return {
        check,
        checkPrivileges,
        advance: (ms: number) => {
          time += ms;
        },
      };
    };

    it('runs one privilege check for every tool listed on the same request', async () => {
      const { check, checkPrivileges } = createAvailability();
      const request = httpServerMock.createKibanaRequest();

      await Promise.all([check(request), check(request), check(request)]);

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
    });

    it('checks each request separately', async () => {
      const { check, checkPrivileges } = createAvailability();

      await check();
      await check();

      expect(checkPrivileges).toHaveBeenCalledTimes(2);
    });

    it('checks again once the cached result expires', async () => {
      const { check, checkPrivileges, advance } = createAvailability();
      const request = httpServerMock.createKibanaRequest();

      await check(request);
      advance(SANDBOX_ACCESS_CACHE_TTL_MS);
      await check(request);

      expect(checkPrivileges).toHaveBeenCalledTimes(2);
    });

    it('does not reuse a failed check', async () => {
      const { check, checkPrivileges } = createAvailability();
      const request = httpServerMock.createKibanaRequest();
      checkPrivileges.mockRejectedValueOnce(new Error('es unavailable'));

      await expect(check(request)).rejects.toThrow('es unavailable');
      await expect(check(request)).resolves.toEqual({ status: 'available' });
      expect(checkPrivileges).toHaveBeenCalledTimes(2);
    });
  });
});

describe('checkSandboxAccess', () => {
  const request = httpServerMock.createKibanaRequest();
  const security = (hasAllRequested: boolean) =>
    ({
      authz: {
        mode: { useRbacForRequest: () => true },
        checkPrivilegesDynamicallyWithRequest: () => async () => ({ hasAllRequested }),
        actions: { api: { get: (operation: string) => `api:${operation}` } },
      },
    } as unknown as SecurityPluginStart);
  const { featureFlags } = coreMock.createStart();
  featureFlags.getBooleanValue$.mockReturnValue(of(true));

  it('denies a user without the manage privilege, for anything that reads a workspace', async () => {
    await expect(
      checkSandboxAccess({ request, spaceId: 'default', featureFlags, security: security(false) })
    ).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('denies a workspace read outside the space Nightshift runs in', async () => {
    await expect(
      checkSandboxAccess({ request, spaceId: 'marketing', featureFlags, security: security(true) })
    ).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('allows a user with it', async () => {
    await expect(
      checkSandboxAccess({ request, spaceId: 'default', featureFlags, security: security(true) })
    ).resolves.toEqual({ status: 'available' });
  });
});
