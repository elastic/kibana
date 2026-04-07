/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { installAiPromptsPackageFlow } from '.';
import { installSecurityAiPromptsPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts';

jest.mock('../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts');

const installSecurityAiPromptsPackageMock =
  installSecurityAiPromptsPackage as jest.MockedFunction<typeof installSecurityAiPromptsPackage>;

const createMockSecurityContext = () =>
  ({
    getInternalFleetServices: jest.fn(),
    getAppClient: jest.fn(),
  }) as unknown;

const createMockInitializationFlowContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve(createMockSecurityContext()),
    },
  }) as unknown as InitializationFlowContext;

describe('installAiPromptsPackageFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(installAiPromptsPackageFlow.id).toBe(INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE);
  });

  it('does not have runFirst set', () => {
    expect(installAiPromptsPackageFlow.runFirst).toBeUndefined();
  });

  describe('resolveProvisionContext', () => {
    it('resolves the security solution context', async () => {
      const logger = loggerMock.create();
      const context = createMockInitializationFlowContext();

      const provisionContext =
        await installAiPromptsPackageFlow.resolveProvisionContext(context, logger);

      expect(provisionContext.securityContext).toBeDefined();
    });
  });

  describe('provision', () => {
    it('returns ready with package info on successful installation', async () => {
      const logger = loggerMock.create();
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_ai_prompts', version: '1.0.0' } as never,
      });

      const result = await installAiPromptsPackageFlow.provision(
        { securityContext: createMockSecurityContext() as never },
        logger
      );

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
      const logger = loggerMock.create();
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'already_installed',
        package: { name: 'security_ai_prompts', version: '1.0.0' } as never,
      });

      const result = await installAiPromptsPackageFlow.provision(
        { securityContext: createMockSecurityContext() as never },
        logger
      );

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: expect.objectContaining({ install_status: 'already_installed' }),
      });
    });

    it('returns an error result when the package is not available', async () => {
      const logger = loggerMock.create();
      installSecurityAiPromptsPackageMock.mockResolvedValue(null);

      const result = await installAiPromptsPackageFlow.provision(
        { securityContext: createMockSecurityContext() as never },
        logger
      );

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'Security AI prompts package is not available',
      });
    });

    it('does not log success when the package is not available', async () => {
      const logger = loggerMock.create();
      installSecurityAiPromptsPackageMock.mockResolvedValue(null);

      await installAiPromptsPackageFlow.provision(
        { securityContext: createMockSecurityContext() as never },
        logger
      );

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('logs a message on successful installation', async () => {
      const logger = loggerMock.create();
      installSecurityAiPromptsPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'security_ai_prompts', version: '2.0.0' } as never,
      });

      await installAiPromptsPackageFlow.provision(
        { securityContext: createMockSecurityContext() as never },
        logger
      );

      expect(logger.info).toHaveBeenCalledWith(
        'AI prompts package initialized: "security_ai_prompts" v2.0.0'
      );
    });
  });
});
