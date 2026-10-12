/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
} from '../../common/constants';
import { createAssertAlertZeroAccess, assertAlertZeroEnabled } from './assert_alertzero_access';

const setup = () => {
  const core = coreMock.createStart();
  const security = securityMock.createStart();
  const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
  security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
  const request = httpServerMock.createKibanaRequest();
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  core.uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
  uiSettingsClient.get.mockResolvedValue(true);
  const assertAccess = createAssertAlertZeroAccess(async () => ({ core, security }));
  return { core, security, checkPrivileges, request, uiSettingsClient, assertAccess };
};

describe('createAssertAlertZeroAccess', () => {
  it.each([
    ['read', ALERTZERO_API_PRIVILEGE_READ],
    ['write', ALERTZERO_API_PRIVILEGE_WRITE],
  ] as const)('allows %s access using the caller and their space', async (access, privilege) => {
    const { core, security, checkPrivileges, request, uiSettingsClient, assertAccess } = setup();
    await expect(assertAccess(request, access)).resolves.toBeUndefined();
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [security.authz.actions.api.get(privilege)],
    });
    expect(core.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(core.uiSettings.asScopedToClient).toHaveBeenLastCalledWith(
      core.savedObjects.getScopedClient.mock.results[0].value
    );
    expect(uiSettingsClient.get).toHaveBeenCalledWith(ALERTZERO_ENABLED_SETTING_ID);
  });

  it.each([
    ['read', 'Read'],
    ['write', 'All (write)'],
  ] as const)('rejects missing %s privileges', async (access, label) => {
    const { checkPrivileges, request, assertAccess } = setup();
    checkPrivileges.mockResolvedValue({ hasAllRequested: false });
    await expect(assertAccess(request, access)).rejects.toThrow(
      `Missing AlertZero ${label} privilege.`
    );
  });

  it.each([false, undefined])('rejects a disabled or missing setting (%s)', async (enabled) => {
    const { request, uiSettingsClient, assertAccess } = setup();
    uiSettingsClient.get.mockResolvedValue(enabled);
    await expect(assertAccess(request, 'read')).rejects.toThrow(
      'AlertZero is disabled in this space.'
    );
  });

  it('rechecks the setting and privileges on subsequent calls', async () => {
    const { request, uiSettingsClient, checkPrivileges, assertAccess } = setup();
    await assertAccess(request, 'read');
    uiSettingsClient.get.mockResolvedValue(false);
    await expect(assertAccess(request, 'read')).rejects.toThrow('AlertZero is disabled');
    uiSettingsClient.get.mockResolvedValue(true);
    checkPrivileges.mockResolvedValue({ hasAllRequested: false });
    await expect(assertAccess(request, 'read')).rejects.toThrow('Missing AlertZero Read');
  });

  it('fails closed when security is unavailable', async () => {
    const { core, request } = setup();
    const assertAccess = createAssertAlertZeroAccess(async () => ({ core }));
    await expect(assertAccess(request, 'write')).rejects.toThrow('security is unavailable');
  });

  it('propagates authorization and setting lookup failures', async () => {
    const { request, checkPrivileges, uiSettingsClient, assertAccess } = setup();
    checkPrivileges.mockRejectedValueOnce(new Error('Authorization unavailable'));
    await expect(assertAccess(request, 'read')).rejects.toThrow('Authorization unavailable');
    uiSettingsClient.get.mockRejectedValueOnce(new Error('Settings unavailable'));
    await expect(assertAccess(request, 'read')).rejects.toThrow('Settings unavailable');
  });
});

describe('assertAlertZeroEnabled', () => {
  it('checks the space setting without requiring AlertZero privileges', async () => {
    const { core, request, checkPrivileges, uiSettingsClient } = setup();
    checkPrivileges.mockResolvedValue({ hasAllRequested: false });
    await expect(assertAlertZeroEnabled(core, request)).resolves.toBeUndefined();
    expect(checkPrivileges).not.toHaveBeenCalled();
    expect(uiSettingsClient.get).toHaveBeenCalledWith(ALERTZERO_ENABLED_SETTING_ID);
    uiSettingsClient.get.mockResolvedValue(false);
    await expect(assertAlertZeroEnabled(core, request)).rejects.toThrow('AlertZero is disabled');
  });
});
