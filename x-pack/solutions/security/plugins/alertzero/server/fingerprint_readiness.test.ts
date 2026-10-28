/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { of } from 'rxjs';
import type { AlertZeroConfig } from './config';
import { AlertZeroPlugin } from './plugin';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./inference_features', () => ({
  registerAlertZeroInferenceFeatures: jest.fn(),
}));

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./agent', () => ({
  agentType: { id: 'mock-alertzero-type', baseConfiguration: {} },
  ensureAgentSafe: jest.fn().mockResolvedValue(undefined),
  registerAgentType: jest.fn(),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createPlugin = () => {
  const config: AlertZeroConfig = { enabled: true };
  const context = {
    env: { packageInfo: { buildFlavor: 'traditional' } },
    logger: { get: () => loggerMock.create() },
    config: { get: () => config },
  } as unknown as ConstructorParameters<typeof AlertZeroPlugin>[0];
  return new AlertZeroPlugin(context);
};

const createCoreStart = (indices: { putIndexTemplate: jest.Mock; exists?: jest.Mock }): CoreStart =>
  ({
    elasticsearch: {
      client: {
        asInternalUser: {
          indices: {
            getIndexTemplate: jest.fn().mockResolvedValue({ index_templates: [] }),
            putIndexTemplate: indices.putIndexTemplate,
            exists: indices.exists ?? jest.fn().mockResolvedValue(false),
            getMapping: jest.fn(),
          },
        },
      },
    },
    featureFlags: { getBooleanValue$: () => of(true) },
    security: { serviceAccounts: { isEnabled: () => false } },
  } as unknown as CoreStart);

describe('fingerprint template readiness', () => {
  it('returns a contract and refuses writes until the template install succeeds', async () => {
    let finishInstall: (value: { acknowledged: boolean }) => void = () => undefined;
    const install = new Promise<{ acknowledged: boolean }>((resolve) => {
      finishInstall = resolve;
    });
    const contract = createPlugin().start(
      createCoreStart({ putIndexTemplate: jest.fn().mockReturnValue(install) }),
      {} as never
    );

    expect(contract).not.toBeInstanceOf(Promise);
    expect(contract.attackFingerprintWritesAllowed).toBe(false);

    await flushPromises();
    expect(contract.attackFingerprintWritesAllowed).toBe(false);

    finishInstall({ acknowledged: true });
    await flushPromises();

    expect(contract.attackFingerprintWritesAllowed).toBe(true);
  });

  it('keeps writes refused when the template install fails', async () => {
    const contract = createPlugin().start(
      createCoreStart({
        putIndexTemplate: jest.fn().mockRejectedValue(new Error('security_exception')),
      }),
      {} as never
    );

    await flushPromises();

    expect(contract.attackFingerprintWritesAllowed).toBe(false);
  });
});
