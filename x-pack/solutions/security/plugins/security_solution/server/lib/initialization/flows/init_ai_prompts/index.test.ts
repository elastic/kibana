/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { INITIALIZATION_FLOW_STATUS_READY } from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { initAiPromptsFlow } from '.';
import { installSecurityAiPromptsPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts';

jest.mock('../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts');

const installSecurityAiPromptsPackageMock = installSecurityAiPromptsPackage as jest.MockedFunction<
  typeof installSecurityAiPromptsPackage
>;

const createMockSecurityContext = () =>
  ({
    getInternalFleetServices: jest.fn(),
    getAppClient: jest.fn(),
  } as unknown);

const createMockInitializationFlowContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve(createMockSecurityContext()),
    },
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

describe('initAiPromptsFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be configured to run in parallel', () => {
    expect(initAiPromptsFlow.runFirst).toBeUndefined();
  });

  describe('runFlow', () => {
    it('returns ready with package info on successful installation', async () => {
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_ai_prompts', version: '1.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initAiPromptsFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'security_ai_prompts',
          version: '1.0.0',
          install_status: 'installed',
        },
      });
    });

    it('returns already_installed status when package is up to date', async () => {
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'already_installed',
        package: { name: 'security_ai_prompts', version: '1.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initAiPromptsFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: expect.objectContaining({ install_status: 'already_installed' }),
      });
    });

    it('returns ready with skipped status when the package is not available', async () => {
      installSecurityAiPromptsPackageMock.mockResolvedValue(null);

      const context = createMockInitializationFlowContext();
      const result = await initAiPromptsFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'security_ai_prompts',
          version: '',
          install_status: 'skipped',
        },
      });
    });

    it('logs a debug message when the package is not available', async () => {
      installSecurityAiPromptsPackageMock.mockResolvedValue(null);

      const context = createMockInitializationFlowContext();
      await initAiPromptsFlow.runFlow(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        'AI prompts package installation skipped: package is not available'
      );
      expect(context.logger.info).not.toHaveBeenCalled();
    });

    it('logs a message on successful installation', async () => {
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_ai_prompts', version: '2.0.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      await initAiPromptsFlow.runFlow(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        'AI prompts package initialized: "security_ai_prompts" v2.0.0'
      );
    });
  });
});
