/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { initPrebuiltRulesFlow } from '.';
import { installPrebuiltRulesPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_prebuilt_rules_package';

jest.mock(
  '../../../detection_engine/prebuilt_rules/logic/integrations/install_prebuilt_rules_package'
);

const installPrebuiltRulesPackageMock = installPrebuiltRulesPackage as jest.MockedFunction<
  typeof installPrebuiltRulesPackage
>;

const createMockSecurityContext = () =>
  ({
    getInternalFleetServices: jest.fn(),
    getConfig: jest.fn(),
    getAppClient: jest.fn(),
  } as unknown);

const createMockInitializationFlowContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve(createMockSecurityContext()),
    },
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

describe('initPrebuiltRulesFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(initPrebuiltRulesFlow.id).toBe(INITIALIZATION_FLOW_INIT_PREBUILT_RULES);
  });

  it('should be configured to run sequentially', () => {
    expect(initPrebuiltRulesFlow.runFirst).toBe(true);
  });

  describe('runFlow', () => {
    it('returns ready with package info on successful installation', async () => {
      installPrebuiltRulesPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_detection_engine', version: '1.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initPrebuiltRulesFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'security_detection_engine',
          version: '1.0.0',
          install_status: 'installed',
        },
      });
    });

    it('returns ready with already_installed status when package is up to date', async () => {
      installPrebuiltRulesPackageMock.mockResolvedValue({
        status: 'already_installed',
        package: { name: 'security_detection_engine', version: '1.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initPrebuiltRulesFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'security_detection_engine',
          version: '1.0.0',
          install_status: 'already_installed',
        },
      });
    });

    it('logs a message on successful installation', async () => {
      installPrebuiltRulesPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_detection_engine', version: '2.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      await initPrebuiltRulesFlow.runFlow(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        'Prebuilt rules package initialized: "security_detection_engine" v2.0.0'
      );
    });

    it('propagates errors from installPrebuiltRulesPackage', async () => {
      installPrebuiltRulesPackageMock.mockRejectedValue(new Error('Fleet unavailable'));

      const context = createMockInitializationFlowContext();
      await expect(initPrebuiltRulesFlow.runFlow(context)).rejects.toThrow('Fleet unavailable');
    });
  });
});
