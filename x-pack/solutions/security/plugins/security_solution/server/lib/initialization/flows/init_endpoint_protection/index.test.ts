/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ProductFeatureRulesKey } from '@kbn/security-solution-features/keys';
import {
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { initEndpointProtectionFlow } from '.';
import { installEndpointPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_endpoint_package';

jest.mock('../../../detection_engine/prebuilt_rules/logic/integrations/install_endpoint_package');

const installEndpointPackageMock = installEndpointPackage as jest.MockedFunction<
  typeof installEndpointPackage
>;

const createMockSecurityContext = ({ isExternalDetectionsEnabled = false } = {}) =>
  ({
    getInternalFleetServices: jest.fn(),
    getAppClient: jest.fn(),
    getProductFeatureService: () => ({
      isEnabled: (key: string) =>
        key === ProductFeatureRulesKey.externalDetections && isExternalDetectionsEnabled,
    }),
  } as unknown);

const createMockInitializationFlowContext = ({
  isExternalDetectionsEnabled = false,
} = {}): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve(createMockSecurityContext({ isExternalDetectionsEnabled })),
    },
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

describe('initEndpointProtectionFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(initEndpointProtectionFlow.id).toBe(INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION);
  });

  it('should be configured to run in parallel', () => {
    expect(initEndpointProtectionFlow.runFirst).toBeUndefined();
  });

  describe('runFlow', () => {
    it('skips installation when external detections is enabled', async () => {
      const context = createMockInitializationFlowContext({
        isExternalDetectionsEnabled: true,
      });

      const result = await initEndpointProtectionFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'endpoint',
          version: '',
          install_status: 'skipped',
        },
      });
      expect(installEndpointPackageMock).not.toHaveBeenCalled();
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Endpoint package installation skipped: external detections is enabled'
      );
    });

    it('installs the endpoint package when external detections is disabled', async () => {
      installEndpointPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initEndpointProtectionFlow.runFlow(context);

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'endpoint',
          version: '8.15.0',
          install_status: 'installed',
        },
      });
      expect(installEndpointPackageMock).toHaveBeenCalledTimes(1);
    });

    it('returns already_installed status when package is up to date', async () => {
      installEndpointPackageMock.mockResolvedValue({
        status: 'already_installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      const result = await initEndpointProtectionFlow.runFlow(context);

      expect(result).toEqual(
        expect.objectContaining({
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: expect.objectContaining({ install_status: 'already_installed' }),
        })
      );
    });

    it('logs a message on successful installation', async () => {
      installEndpointPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      const context = createMockInitializationFlowContext();
      await initEndpointProtectionFlow.runFlow(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        'Endpoint package initialized: "endpoint" v8.15.0'
      );
    });

    it('propagates errors from installEndpointPackage', async () => {
      installEndpointPackageMock.mockRejectedValue(new Error('Fleet unavailable'));

      const context = createMockInitializationFlowContext();
      await expect(initEndpointProtectionFlow.runFlow(context)).rejects.toThrow(
        'Fleet unavailable'
      );
    });
  });
});
