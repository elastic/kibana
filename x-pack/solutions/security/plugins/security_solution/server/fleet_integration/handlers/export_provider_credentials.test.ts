/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import type { NewPackagePolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  filterExportProviderKeyReferences,
  rejectExportProviderCredentialsOnCreate,
  rejectResponseActionsInOverrides,
  validateExportProviderCredentials,
} from './export_provider_credentials';
import { EndpointIntegrationFleetError } from './errors';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../common/endpoint/constants';
import {
  EXPORT_PROVIDER_KEY_MIN_AGE_MS,
  type ExportProviderKeyMetadata,
} from '../../endpoint/lib/export_provider_keys';
import { exportProviderKeyMocks } from '../../endpoint/lib/export_provider_keys/mocks';
import { policyFactory } from '../../../common/endpoint/models/policy_config';
import { setExportProviders } from '../../../common/endpoint/models/export_providers';
import type { ExportProvider, PolicyConfig } from '../../../common/endpoint/types';

const buildProvider = (overrides: Partial<ExportProvider> = {}): ExportProvider => ({
  id: 'azure-1',
  type: 'azure_blob',
  account_name: 'acct',
  container: 'dumps',
  ...overrides,
});

/** Writes the same (possibly invalid) providers to all three OSes, bypassing type checks */
const buildPolicy = (providers: unknown[]): PolicyConfig =>
  setExportProviders(policyFactory(), providers as ExportProvider[]);

const getError = (fn: () => void): EndpointIntegrationFleetError => {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the function to throw');
};

describe('rejectResponseActionsInOverrides()', () => {
  it('does not throw when there are no overrides', () => {
    expect(() => rejectResponseActionsInOverrides({})).not.toThrow();
  });

  it.each(['windows', 'mac', 'linux'] as const)('rejects response_actions set on %s', (os) => {
    const packagePolicy = {
      overrides: { inputs: { endpoint: { policy: { [os]: { response_actions: {} } } } } },
    };

    const error = getError(() => rejectResponseActionsInOverrides(packagePolicy));

    expect(error).toBeInstanceOf(EndpointIntegrationFleetError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(`Package policy overrides can't set response_actions`);
  });

  it.each<[string, Pick<NewPackagePolicy, 'overrides'>]>([
    ['overrides is null', { overrides: null }],
    ['overrides.inputs is an array', { overrides: { inputs: [] } }],
    ['the input is not an object', { overrides: { inputs: { endpoint: 'not-an-object' } } }],
    [
      'policy is not an object',
      { overrides: { inputs: { endpoint: { policy: 'not-an-object' } } } },
    ],
    [
      'the OS config is not an object',
      { overrides: { inputs: { endpoint: { policy: { windows: 'not-an-object' } } } } },
    ],
    [
      'response_actions is undefined',
      {
        overrides: {
          inputs: { endpoint: { policy: { windows: { response_actions: undefined } } } },
        },
      },
    ],
  ])('tolerates a malformed shape: %s', (_, packagePolicy) => {
    expect(() => rejectResponseActionsInOverrides(packagePolicy)).not.toThrow();
  });
});

describe('rejectExportProviderCredentialsOnCreate()', () => {
  it('does not throw when the policy value is undefined', () => {
    expect(() => rejectExportProviderCredentialsOnCreate(undefined)).not.toThrow();
  });

  it('does not throw when no provider has credentials', () => {
    const policy = buildPolicy([buildProvider()]);

    expect(() => rejectExportProviderCredentialsOnCreate(policy)).not.toThrow();
  });

  it('rejects a provider with credentials, once, even though every OS carries the same copy', () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', account_key: 'secret' } },
    ]);

    const error = getError(() => rejectExportProviderCredentialsOnCreate(policy));

    expect(error).toBeInstanceOf(EndpointIntegrationFleetError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      `export_providers[0] "azure-1": credentials can't be set when the policy is created; ` +
        `set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`
    );
    expect(error.message).not.toContain('secret');
  });

  it('collects one message per provider with credentials', () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', key_id: 'a' } },
      {
        ...buildProvider({ id: 'azure-2' }),
        credentials: { type: 'account_key', key_id: 'b' },
      },
    ]);

    const error = getError(() => rejectExportProviderCredentialsOnCreate(policy));

    expect(error.message).toBe(
      `export_providers[0] "azure-1": credentials can't be set when the policy is created; ` +
        `set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}; ` +
        `export_providers[1] "azure-2": credentials can't be set when the policy is created; ` +
        `set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`
    );
  });

  it.each<[string, unknown]>([
    ['the policy value is a string', 'not-an-object'],
    [
      'export_providers is not an array',
      { windows: { response_actions: { export_providers: {} } } },
    ],
    ['a provider is not an object', { windows: { response_actions: { export_providers: ['x'] } } }],
  ])('tolerates a malformed shape: %s', (_, policyValue) => {
    expect(() => rejectExportProviderCredentialsOnCreate(policyValue)).not.toThrow();
  });
});

describe('validateExportProviderCredentials()', () => {
  it('does not throw for a policy without export providers', () => {
    expect(() => validateExportProviderCredentials(policyFactory())).not.toThrow();
  });

  it('does not throw when every reference is valid and unique', () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', key_id: 'key-1' } },
      {
        ...buildProvider({ id: 'azure-2' }),
        credentials: { type: 'account_key', key_id: 'key-2' },
      },
    ]);

    expect(() => validateExportProviderCredentials(policy)).not.toThrow();
  });

  it('rejects a plaintext key without echoing it', () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', account_key: 'super-secret' } },
    ]);

    const error = getError(() => validateExportProviderCredentials(policy));

    expect(error).toBeInstanceOf(EndpointIntegrationFleetError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      `export_providers[0] "azure-1": credentials must be a key reference; set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`
    );
    expect(error.message).not.toContain('super-secret');
  });

  it('rejects two providers that reference the same key_id', () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', key_id: 'shared-key' } },
      {
        ...buildProvider({ id: 'azure-2' }),
        credentials: { type: 'account_key', key_id: 'shared-key' },
      },
    ]);

    const error = getError(() => validateExportProviderCredentials(policy));

    expect(error.message).toBe(
      'export_providers[0] "azure-1": credentials.key_id must be unique within the policy; ' +
        'export_providers[1] "azure-2": credentials.key_id must be unique within the policy'
    );
  });
});

describe('filterExportProviderKeyReferences()', () => {
  const PACKAGE_POLICY_ID = 'package-policy-1';
  const NOW = Date.parse('2025-01-01T12:00:00.000Z');

  let logger: jest.Mocked<Logger>;
  let keyClient: ReturnType<typeof exportProviderKeyMocks.createClient>;

  const buildStoredPolicy = (policy: PolicyConfig): Pick<PackagePolicy, 'inputs'> =>
    ({
      inputs: [{ config: { policy: { value: policy } } }],
    } as unknown as Pick<PackagePolicy, 'inputs'>);

  const buildMetadata = (
    overrides: Partial<ExportProviderKeyMetadata> = {}
  ): ExportProviderKeyMetadata => ({
    id: 'key-1',
    package_policy_id: PACKAGE_POLICY_ID,
    created_at: new Date(NOW).toISOString(),
    ...overrides,
  });

  const run = async (
    policy: PolicyConfig,
    options: {
      metadata?: Map<string, ExportProviderKeyMetadata>;
      storedPolicy?: Pick<PackagePolicy, 'inputs'> | undefined;
      getStoredPolicy?: () => Promise<Pick<PackagePolicy, 'inputs'> | undefined>;
    } = {}
  ): Promise<PolicyConfig> => {
    if (options.metadata) {
      keyClient.getKeyMetadata.mockResolvedValue(options.metadata);
    }

    return filterExportProviderKeyReferences({
      policy,
      packagePolicyId: PACKAGE_POLICY_ID,
      getStoredPolicy: options.getStoredPolicy ?? (async () => options.storedPolicy),
      keyClient,
      logger,
      now: NOW,
    });
  };

  beforeEach(() => {
    logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
    keyClient = exportProviderKeyMocks.createClient();
  });

  it('returns the policy unchanged and reads nothing when no provider references a key', async () => {
    const policy = buildPolicy([buildProvider()]);

    const result = await run(policy);

    expect(result).toBe(policy);
    expect(keyClient.getKeyMetadata).not.toHaveBeenCalled();
  });

  it('keeps a reference that is owned and already in the stored policy, even if old', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);
    const oldMetadata = buildMetadata({
      created_at: new Date(NOW - EXPORT_PROVIDER_KEY_MIN_AGE_MS * 10).toISOString(),
    });

    const result = await run(policy, {
      metadata: new Map([['key-1', oldMetadata]]),
      storedPolicy: buildStoredPolicy(policy),
    });

    for (const os of ['windows', 'mac', 'linux'] as const) {
      expect(result[os].response_actions?.export_providers?.[0]).toEqual(providerWithKey);
    }
  });

  it('keeps a reference that is owned, new, and not yet in the stored policy', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);
    const freshMetadata = buildMetadata({ created_at: new Date(NOW - 1000).toISOString() });

    const result = await run(policy, {
      metadata: new Map([['key-1', freshMetadata]]),
      storedPolicy: buildStoredPolicy(buildPolicy([buildProvider()])),
    });

    for (const os of ['windows', 'mac', 'linux'] as const) {
      expect(result[os].response_actions?.export_providers?.[0]).toEqual(providerWithKey);
    }
  });

  it('drops a reference owned by a different package policy, on every OS', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);
    const foreignMetadata = buildMetadata({ package_policy_id: 'another-package-policy' });

    const result = await run(policy, {
      metadata: new Map([['key-1', foreignMetadata]]),
      storedPolicy: buildStoredPolicy(policy),
    });

    for (const os of ['windows', 'mac', 'linux'] as const) {
      const [resultProvider] = result[os].response_actions!.export_providers!;
      expect(resultProvider).not.toHaveProperty('credentials');
      expect(resultProvider).toEqual(buildProvider());
    }
  });

  it('drops a reference whose key object is missing', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);

    const result = await run(policy, {
      metadata: new Map(),
      storedPolicy: buildStoredPolicy(policy),
    });

    expect(result.windows.response_actions!.export_providers![0]).not.toHaveProperty('credentials');
  });

  it('drops a retired reference: owned, not in the stored policy, and older than the minimum age', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);
    const retiredMetadata = buildMetadata({
      created_at: new Date(NOW - EXPORT_PROVIDER_KEY_MIN_AGE_MS - 1).toISOString(),
    });

    const result = await run(policy, {
      metadata: new Map([['key-1', retiredMetadata]]),
      storedPolicy: buildStoredPolicy(buildPolicy([buildProvider()])),
    });

    expect(result.windows.response_actions!.export_providers![0]).not.toHaveProperty('credentials');
    expect(logger.debug).toHaveBeenCalled();
  });

  it('treats a missing stored policy as referencing nothing', async () => {
    const providerWithKey = {
      ...buildProvider(),
      credentials: { type: 'account_key', key_id: 'key-1' },
    };
    const policy = buildPolicy([providerWithKey]);
    const retiredMetadata = buildMetadata({
      created_at: new Date(NOW - EXPORT_PROVIDER_KEY_MIN_AGE_MS - 1).toISOString(),
    });

    const result = await run(policy, {
      metadata: new Map([['key-1', retiredMetadata]]),
      storedPolicy: undefined,
    });

    expect(result.windows.response_actions!.export_providers![0]).not.toHaveProperty('credentials');
  });

  it('wraps a metadata read failure in a 500 EndpointIntegrationFleetError', async () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', key_id: 'key-1' } },
    ]);

    keyClient.getKeyMetadata.mockRejectedValue(new Error('saved objects are unavailable'));

    await expect(
      run(policy, { getStoredPolicy: async () => buildStoredPolicy(policy) })
    ).rejects.toMatchObject({
      statusCode: 500,
      apiPassThrough: true,
      message: 'Unable to check the export provider key references; try again',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('wraps a stored-policy read failure in a 500 EndpointIntegrationFleetError', async () => {
    const policy = buildPolicy([
      { ...buildProvider(), credentials: { type: 'account_key', key_id: 'key-1' } },
    ]);

    keyClient.getKeyMetadata.mockResolvedValue(new Map([['key-1', buildMetadata()]]));

    await expect(
      run(policy, {
        getStoredPolicy: async () => {
          throw new Error('fleet is unavailable');
        },
      })
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
