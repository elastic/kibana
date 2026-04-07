/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ProductFeatureRulesKey } from '@kbn/security-solution-features/keys';
import {
  INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { installEndpointPackageFlow } from '.';
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
  }) as unknown;

const createMockInitializationFlowContext = ({
  isExternalDetectionsEnabled = false,
} = {}): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve(
        createMockSecurityContext({ isExternalDetectionsEnabled })
      ),
    },
  }) as unknown as InitializationFlowContext;

describe('installEndpointPackageFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(installEndpointPackageFlow.id).toBe(INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE);
  });

  it('does not have runFirst set', () => {
    expect(installEndpointPackageFlow.runFirst).toBeUndefined();
  });

  describe('resolveProvisionContext', () => {
    it('resolves isExternalDetectionsEnabled from the product feature service', async () => {
      const logger = loggerMock.create();

      const contextDisabled = createMockInitializationFlowContext({
        isExternalDetectionsEnabled: false,
      });
      const provisionDisabled = await installEndpointPackageFlow.resolveProvisionContext(
        contextDisabled,
        logger
      );
      expect(provisionDisabled.isExternalDetectionsEnabled).toBe(false);

      const contextEnabled = createMockInitializationFlowContext({
        isExternalDetectionsEnabled: true,
      });
      const provisionEnabled = await installEndpointPackageFlow.resolveProvisionContext(
        contextEnabled,
        logger
      );
      expect(provisionEnabled.isExternalDetectionsEnabled).toBe(true);
    });
  });

  describe('provision', () => {
    it('skips installation when external detections is enabled', async () => {
      const logger = loggerMock.create();

      const result = await installEndpointPackageFlow.provision(
        {
          securityContext: createMockSecurityContext({ isExternalDetectionsEnabled: true }) as never,
          isExternalDetectionsEnabled: true,
        },
        logger
      );

      expect(result).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: 'endpoint',
          version: '',
          install_status: 'skipped',
        },
      });
      expect(installEndpointPackageMock).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Endpoint package installation skipped: external detections is enabled'
      );
    });

    it('installs the endpoint package when external detections is disabled', async () => {
      const logger = loggerMock.create();
      installEndpointPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      const result = await installEndpointPackageFlow.provision(
        {
          securityContext: createMockSecurityContext() as never,
          isExternalDetectionsEnabled: false,
        },
        logger
      );

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
      const logger = loggerMock.create();
      installEndpointPackageMock.mockResolvedValue({
        status: 'already_installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      const result = await installEndpointPackageFlow.provision(
        {
          securityContext: createMockSecurityContext() as never,
          isExternalDetectionsEnabled: false,
        },
        logger
      );

      expect(result.payload).toEqual(
        expect.objectContaining({ install_status: 'already_installed' })
      );
    });

    it('logs a message on successful installation', async () => {
      const logger = loggerMock.create();
      installEndpointPackageMock.mockResolvedValue({
        status: 'installed',
        package: { name: 'endpoint', version: '8.15.0' } as never,
      });

      await installEndpointPackageFlow.provision(
        {
          securityContext: createMockSecurityContext() as never,
          isExternalDetectionsEnabled: false,
        },
        logger
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Endpoint package initialized: "endpoint" v8.15.0'
      );
    });

    it('propagates errors from installEndpointPackage', async () => {
      const logger = loggerMock.create();
      installEndpointPackageMock.mockRejectedValue(new Error('Fleet unavailable'));

      await expect(
        installEndpointPackageFlow.provision(
          {
            securityContext: createMockSecurityContext() as never,
            isExternalDetectionsEnabled: false,
          },
          logger
        )
      ).rejects.toThrow('Fleet unavailable');
    });
  });
});
