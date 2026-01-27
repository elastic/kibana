/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupAlertsCapabilitiesSwitcher } from './alerts_capabilities_switcher';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Capabilities } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import {
  ALERTS_FEATURE_ID,
  ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
  ALERTS_UI_EDIT,
  ALERTS_UI_READ,
} from '@kbn/security-solution-features/constants';

describe('setupAlertsCapabilitiesSwitcher', () => {
  const createMockDeps = () => {
    const coreSetup = coreMock.createSetup();
    const logger = loggingSystemMock.createLogger();
    const security = securityMock.createStart();

    return {
      coreSetup,
      logger,
      security,
      getSecurityStart: jest.fn().mockResolvedValue(security),
    };
  };

  const createCapabilities = (alertsCapabilities: Record<string, boolean> = {}): Capabilities => ({
    navLinks: {},
    management: {},
    catalogue: {},
    [ALERTS_FEATURE_ID]: {
      ...alertsCapabilities,
    },
  });

  describe('registerProvider', () => {
    it('registers the deprecated capability with default value of false', () => {
      const { coreSetup, logger, getSecurityStart } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      expect(coreSetup.capabilities.registerProvider).toHaveBeenCalledTimes(1);
      const [provider] = coreSetup.capabilities.registerProvider.mock.calls[0];
      expect(provider()).toEqual({
        [ALERTS_FEATURE_ID]: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: false,
        },
      });
    });
  });

  describe('registerSwitcher', () => {
    it('registers a capabilities switcher with the correct options', () => {
      const { coreSetup, logger, getSecurityStart } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
      expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledWith(expect.any(Function), {
        capabilityPath: `${ALERTS_FEATURE_ID}.*`,
      });
    });

    it('returns empty object when user already has edit_alerts capability', async () => {
      const { coreSetup, logger, getSecurityStart, security } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_EDIT]: true,
        [ALERTS_UI_READ]: true,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({});
      expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
    });

    it('returns empty object when user has no read_alerts capability', async () => {
      const { coreSetup, logger, getSecurityStart, security } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_EDIT]: false,
        [ALERTS_UI_READ]: false,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({});
      expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
    });

    it('returns empty object when security plugin is not available', async () => {
      const { coreSetup, logger } = createMockDeps();
      const getSecurityStart = jest.fn().mockResolvedValue(undefined);

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_READ]: true,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({});
    });

    it('enables deprecated capability when user has deprecated API privilege', async () => {
      const { coreSetup, logger, getSecurityStart, security } = createMockDeps();

      const mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
      security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_READ]: true,
        [ALERTS_UI_EDIT]: false,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({
        [ALERTS_FEATURE_ID]: {
          ...capabilities[ALERTS_FEATURE_ID],
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
      });

      expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE}`],
      });
    });

    it('returns empty object when user does not have deprecated API privilege', async () => {
      const { coreSetup, logger, getSecurityStart, security } = createMockDeps();

      const mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: false });
      security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_READ]: true,
        [ALERTS_UI_EDIT]: false,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({});

      expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE}`],
      });
    });

    it('returns empty object and logs error when privilege check fails', async () => {
      const { coreSetup, logger, getSecurityStart, security } = createMockDeps();

      const mockError = new Error('Privilege check failed');
      const mockCheckPrivileges = jest.fn().mockRejectedValue(mockError);
      security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];
      const request = httpServerMock.createKibanaRequest();
      const capabilities = createCapabilities({
        [ALERTS_UI_READ]: true,
        [ALERTS_UI_EDIT]: false,
      });

      const result = await switcher(request, capabilities, false);

      expect(result).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        `Error in alerts capabilities switcher: ${mockError}`
      );
    });
  });
});
