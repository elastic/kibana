/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { installReceiptsDestination } from './lib/ingest_receipts';
import { ObservabilityOnboardingPlugin } from './plugin';
import type { ObservabilityOnboardingPluginSetupDependencies } from './types';

jest.mock('./lib/ingest_receipts', () => ({
  installReceiptsDestination: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./routes', () => ({
  getObservabilityOnboardingServerRouteRepository: jest.fn().mockReturnValue({}),
}));

const installReceiptsDestinationMock = jest.mocked(installReceiptsDestination);

const createSetupDependencies = ({
  managedOtlpServiceUrl,
}: {
  managedOtlpServiceUrl?: string;
}): ObservabilityOnboardingPluginSetupDependencies =>
  ({
    observability: { managedOtlpServiceUrl },
    customIntegrations: { registerCustomIntegration: jest.fn() },
    data: {},
    cloud: {},
    usageCollection: {},
    fleet: {},
  } as unknown as ObservabilityOnboardingPluginSetupDependencies);

const startPlugin = async ({
  serverless,
  managedOtlpServiceUrl,
}: {
  serverless: boolean;
  managedOtlpServiceUrl?: string;
}) => {
  const initContext = coreMock.createPluginInitializerContext({
    ui: { enabled: true },
    serverless: { enabled: serverless },
  });
  const plugin = new ObservabilityOnboardingPlugin(initContext);
  plugin.setup(coreMock.createSetup(), createSetupDependencies({ managedOtlpServiceUrl }));

  const coreStart = coreMock.createStart();
  plugin.start(coreStart);
  await plugin.receiptsDestinationInstall;

  return { coreStart, logger: initContext.logger.get() };
};

describe('ObservabilityOnboardingPlugin', () => {
  beforeEach(() => {
    installReceiptsDestinationMock.mockClear();
  });

  describe('ingest receipts destination', () => {
    it('installs it on serverless with the internal user client', async () => {
      const { coreStart } = await startPlugin({ serverless: true });

      expect(installReceiptsDestinationMock).toHaveBeenCalledTimes(1);
      expect(installReceiptsDestinationMock).toHaveBeenCalledWith({
        esClient: coreStart.elasticsearch.client.asInternalUser,
        logger: expect.anything(),
      });
    });

    it('installs it on stateful when a managed OTLP service URL is configured', async () => {
      await startPlugin({
        serverless: false,
        managedOtlpServiceUrl: 'https://otlp.example.elastic.cloud',
      });

      expect(installReceiptsDestinationMock).toHaveBeenCalledTimes(1);
    });

    it('does nothing on stateful without a managed OTLP service URL', async () => {
      await startPlugin({ serverless: false });

      expect(installReceiptsDestinationMock).not.toHaveBeenCalled();
    });
  });
});
