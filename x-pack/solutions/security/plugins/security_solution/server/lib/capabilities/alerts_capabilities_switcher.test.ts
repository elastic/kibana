/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { setupAlertsCapabilitiesSwitcher } from './alerts_capabilities_switcher';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('setupAlertsCapabilitiesSwitcher', () => {
  const createMockDeps = () => {
    const coreSetup = coreMock.createSetup();
    const logger = loggingSystemMock.createLogger();

    return {
      coreSetup,
      logger,
      getSecurityStart: jest.fn(),
    };
  };

  describe('registerProvider', () => {
    it('registers a capability provider once', () => {
      const { coreSetup, logger, getSecurityStart } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      expect(coreSetup.capabilities.registerProvider).toHaveBeenCalledTimes(1);
    });

    it('registers deprecated capabilities for all legacy security features', () => {
      const { coreSetup, logger, getSecurityStart } = createMockDeps();

      setupAlertsCapabilitiesSwitcher({ core: coreSetup, logger, getSecurityStart });

      const [provider] = coreSetup.capabilities.registerProvider.mock.calls[0];
      const capabilities = provider();

      expect(capabilities).toEqual({
        siem: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
        siemV2: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
        siemV3: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
        siemV4: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
        securitySolutionRulesV1: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
        securitySolutionRulesV2: {
          [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
        },
      });
    });
  });
});
