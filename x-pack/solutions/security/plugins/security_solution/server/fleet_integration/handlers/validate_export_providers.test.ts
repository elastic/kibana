/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import {
  removeDottedResponseActionsKeys,
  validateExportProviders,
  validateNoDottedResponseActionsKeys,
} from './validate_export_providers';
import { EndpointIntegrationFleetError } from './errors';
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

const getError = (policy: PolicyConfig): EndpointIntegrationFleetError => {
  try {
    validateExportProviders(policy);
  } catch (error) {
    return error;
  }

  throw new Error('Expected validateExportProviders() to throw');
};

describe('validateExportProviders()', () => {
  describe('valid policies', () => {
    it('should accept a policy without export providers', () => {
      expect(() => validateExportProviders(policyFactory())).not.toThrow();
    });

    it('should accept absent and empty lists on different OSes', () => {
      const policy = set(policyFactory(), 'mac.response_actions', { export_providers: [] });
      set(policy, 'linux.response_actions', {});

      expect(() => validateExportProviders(policy)).not.toThrow();
    });

    it('should accept a provider with and without a service_url', () => {
      const policy = buildPolicy([
        buildProvider(),
        buildProvider({ id: 'azure-2', service_url: 'https://acct.blob.core.windows.net' }),
      ]);

      expect(() => validateExportProviders(policy)).not.toThrow();
    });

    it('should accept the maximum number of providers', () => {
      const providers = Array.from({ length: 10 }, (_, index) =>
        buildProvider({ id: `azure-${index}` })
      );

      expect(() => validateExportProviders(buildPolicy(providers))).not.toThrow();
    });
  });

  describe('policy-level rules', () => {
    it('should reject lists that differ between OSes', () => {
      const policy = buildPolicy([buildProvider()]);
      set(policy, 'mac.response_actions.export_providers', [buildProvider({ id: 'azure-2' })]);

      expect(getError(policy).message).toBe(
        'response_actions.export_providers must be the same for windows, mac and linux'
      );
    });

    it('should reject a list that only exists on one OS', () => {
      const policy = set(policyFactory(), 'linux.response_actions.export_providers', [
        buildProvider(),
      ]);

      expect(getError(policy).message).toBe(
        'response_actions.export_providers must be the same for windows, mac and linux'
      );
    });

    it('should reject more than 10 providers', () => {
      const providers = Array.from({ length: 11 }, (_, index) =>
        buildProvider({ id: `azure-${index}` })
      );

      expect(getError(buildPolicy(providers)).message).toBe(
        'response_actions.export_providers can have at most 10 providers'
      );
    });

    it('should reject a response_actions that is not an object', () => {
      const policy = set(policyFactory(), 'mac.response_actions', 'azure-1');

      expect(getError(policy).message).toBe('mac.response_actions must be an object');
    });

    it('should reject a response_actions key other than export_providers', () => {
      const policy = set(buildPolicy([buildProvider()]), 'mac.response_actions.foo', true);

      expect(getError(policy).message).toBe('mac.response_actions: "foo" is not supported');
    });

    it('should reject an export_providers that is not an array', () => {
      const policy = set(policyFactory(), 'linux.response_actions', {
        export_providers: buildProvider(),
      });

      expect(getError(policy).message).toBe(
        'linux.response_actions.export_providers must be an array'
      );
    });
  });

  describe('provider rules', () => {
    it('should reject a provider that is not an object', () => {
      expect(getError(buildPolicy(['azure-1'])).message).toBe(
        'export_providers[0] must be an object'
      );
    });

    it('should reject credentials', () => {
      const policy = buildPolicy([{ ...buildProvider(), credentials: { account_key: 'key' } }]);

      expect(getError(policy).message).toBe(
        'export_providers[0] "azure-1": credentials are not supported yet'
      );
    });

    it('should reject ssl', () => {
      const policy = buildPolicy([{ ...buildProvider(), ssl: { verification_mode: 'none' } }]);

      expect(getError(policy).message).toBe(
        'export_providers[0] "azure-1": ssl is not supported yet'
      );
    });

    it('should reject an unknown key', () => {
      const policy = buildPolicy([{ ...buildProvider(), foo: 'bar' }]);

      expect(getError(policy).message).toBe(
        'export_providers[0] "azure-1": "foo" is not supported'
      );
    });

    it('should quote and shorten a long unknown key with control characters', () => {
      const key = `x\n${'a'.repeat(100)}`;
      const policy = buildPolicy([{ ...buildProvider(), [key]: true }]);

      const { message } = getError(policy);

      expect(message).toBe(
        `export_providers[0] "azure-1": "x\\n${'a'.repeat(62)}..." is not supported`
      );
      expect(message).not.toContain('\n');
    });

    it.each(['constructor', '__proto__'])(
      'should reject an unknown %s key without reading the prototype',
      (key) => {
        // JSON.parse makes `__proto__` an own key, as an API payload would
        const provider: Record<string, unknown> = JSON.parse(
          `{"id":"azure-1","type":"azure_blob","account_name":"acct","container":"dumps","${key}":{}}`
        );
        expect(Object.keys(provider)).toContain(key);

        expect(getError(buildPolicy([provider])).message).toBe(
          `export_providers[0] "azure-1": "${key}" is not supported`
        );
      }
    );

    it.each<[string, Record<string, unknown>, string]>([
      ['a missing id', { id: undefined }, 'export_providers[0]: id is required'],
      ['an empty id', { id: '' }, 'export_providers[0]: id is required'],
      [
        'an id with invalid characters',
        { id: 'azure 1' },
        'export_providers[0] "azure 1": id must contain only letters, digits, "_" and "-"',
      ],
      [
        'an id that is not a string',
        { id: 1 },
        'export_providers[0]: id must contain only letters, digits, "_" and "-"',
      ],
      ['a missing type', { type: undefined }, 'export_providers[0] "azure-1": type is required'],
      [
        'an unsupported type',
        { type: 's3' },
        'export_providers[0] "azure-1": type must be one of: azure_blob',
      ],
      [
        'a missing account_name',
        { account_name: undefined },
        'export_providers[0] "azure-1": account_name is required',
      ],
      [
        'an invalid account_name',
        { account_name: 'Acct' },
        'export_providers[0] "azure-1": account_name must be 3-24 lowercase letters and digits',
      ],
      [
        'a missing container',
        { container: '' },
        'export_providers[0] "azure-1": container is required',
      ],
      [
        'an invalid container',
        { container: 'my--dumps' },
        'export_providers[0] "azure-1": container must be 3-63 lowercase letters, digits and single hyphens, starting and ending with a letter or digit',
      ],
      [
        'an http service_url',
        { service_url: 'http://acct.blob.core.windows.net' },
        'export_providers[0] "azure-1": service_url must use https',
      ],
      [
        'a service_url with a query',
        { service_url: 'https://acct.blob.core.windows.net/?sig=secret' },
        'export_providers[0] "azure-1": service_url must be a valid URL without credentials, query or fragment',
      ],
      [
        'a service_url that is not an Azure Blob Storage endpoint',
        { service_url: 'https://example.com' },
        'export_providers[0] "azure-1": service_url must be an Azure Blob Storage endpoint (*.blob.core.windows.net, *.blob.core.usgovcloudapi.net or *.blob.core.chinacloudapi.cn)',
      ],
      [
        'a service_url that is too long',
        { service_url: `https://acct.blob.core.windows.net/${'a'.repeat(2048)}` },
        'export_providers[0] "azure-1": service_url must be at most 2048 characters',
      ],
    ])('should reject %s', (_, overrides, expectedMessage) => {
      const policy = buildPolicy([{ ...buildProvider(), ...overrides }]);

      expect(getError(policy).message).toBe(expectedMessage);
    });

    it('should truncate an id that is too long in the provider label', () => {
      const longId = 'a'.repeat(65);

      expect(getError(buildPolicy([buildProvider({ id: longId })])).message).toBe(
        `export_providers[0] "${'a'.repeat(64)}...": id must be at most 64 characters`
      );
    });

    it('should report every provider with a duplicate id', () => {
      const policy = buildPolicy([buildProvider(), buildProvider({ container: 'other' })]);

      expect(getError(policy).message).toBe(
        'export_providers[0] "azure-1": id must be unique within the policy; ' +
          'export_providers[1] "azure-1": id must be unique within the policy'
      );
    });

    it('should accept ids that only differ in case', () => {
      const policy = buildPolicy([buildProvider(), buildProvider({ id: 'Azure-1' })]);

      expect(() => validateExportProviders(policy)).not.toThrow();
    });

    it('should report all errors of all providers in one message', () => {
      const policy = buildPolicy([
        { ...buildProvider({ account_name: 'A' }), credentials: { account_key: 'key' } },
        buildProvider({ id: 'azure-2', type: 's3' as ExportProvider['type'], container: '' }),
      ]);

      expect(getError(policy).message).toBe(
        'export_providers[0] "azure-1": credentials are not supported yet; ' +
          'export_providers[0] "azure-1": account_name must be 3-24 lowercase letters and digits; ' +
          'export_providers[1] "azure-2": type must be one of: azure_blob; ' +
          'export_providers[1] "azure-2": container is required'
      );
    });

    it('should throw a 400 error that Fleet passes through to the API response', () => {
      const error = getError(buildPolicy([{ ...buildProvider(), credentials: {} }]));

      expect(error).toBeInstanceOf(EndpointIntegrationFleetError);
      expect(error.statusCode).toBe(400);
      expect(error.apiPassThrough).toBe(true);
    });
  });
});

describe('validateNoDottedResponseActionsKeys()', () => {
  // `set()` with an array path writes a literal (dotted) key instead of expanding it
  const getDottedKeyError = (policy: PolicyConfig): EndpointIntegrationFleetError => {
    try {
      validateNoDottedResponseActionsKeys(policy);
    } catch (error) {
      return error;
    }

    throw new Error('Expected validateNoDottedResponseActionsKeys() to throw');
  };

  it('should accept a policy with nested export providers', () => {
    expect(() => validateNoDottedResponseActionsKeys(buildPolicy([buildProvider()]))).not.toThrow();
  });

  it.each(['windows.malware', 'windows.response_actionsX', 'response_actions.export_providers'])(
    'should accept the unrelated root key %s',
    (key) => {
      expect(() =>
        validateNoDottedResponseActionsKeys(set(policyFactory(), [key], {}))
      ).not.toThrow();
    }
  );

  it('should accept an unrelated dotted key in an OS', () => {
    const policy = set(policyFactory(), ['linux', 'malware.mode'], 'off');

    expect(() => validateNoDottedResponseActionsKeys(policy)).not.toThrow();
  });

  it.each([
    'windows.response_actions',
    'mac.response_actions.export_providers',
    'linux.response_actions.export_providers.0.service_url',
  ])('should reject the root key %s', (key) => {
    const policy = set(policyFactory(), [key], { export_providers: [buildProvider()] });

    expect(getDottedKeyError(policy).message).toBe(
      `response_actions can't be set with a dotted key ("${key}")`
    );
  });

  it.each(['windows', 'mac', 'linux'])('should reject a response_actions.* key in %s', (os) => {
    const policy = set(
      policyFactory(),
      [os, 'response_actions.export_providers'],
      [buildProvider()]
    );

    expect(getDottedKeyError(policy).message).toBe(
      `response_actions can't be set with a dotted key ("response_actions.export_providers")`
    );
  });

  it('should reject a dotted key inside response_actions', () => {
    const policy = set(
      buildPolicy([buildProvider()]),
      ['mac', 'response_actions', 'export_providers.0.service_url'],
      'https://example.com'
    );

    expect(getDottedKeyError(policy).message).toBe(
      `response_actions can't be set with a dotted key ("export_providers.0.service_url")`
    );
  });

  it('should quote and shorten a long key with control characters', () => {
    const key = `windows.response_actions.\n${'a'.repeat(100)}`;
    const { message } = getDottedKeyError(set(policyFactory(), [key], {}));

    expect(message).toBe(
      `response_actions can't be set with a dotted key ("windows.response_actions.\\n${'a'.repeat(
        38
      )}...")`
    );
    expect(message).not.toContain('\n');
  });

  it('should throw a 400 error that Fleet passes through to the API response', () => {
    const error = getDottedKeyError(set(policyFactory(), ['windows.response_actions'], {}));

    expect(error).toBeInstanceOf(EndpointIntegrationFleetError);
    expect(error.statusCode).toBe(400);
    expect(error.apiPassThrough).toBe(true);
  });
});

describe('removeDottedResponseActionsKeys()', () => {
  // `set()` with an array path writes a literal (dotted) key instead of expanding it
  it.each([
    ['the root key windows.response_actions', ['windows.response_actions']],
    [
      'the root key linux.response_actions.export_providers.0.service_url',
      ['linux.response_actions.export_providers.0.service_url'],
    ],
    ['a response_actions.* key in mac', ['mac', 'response_actions.export_providers']],
    [
      'a dotted key inside response_actions',
      ['windows', 'response_actions', 'export_providers.0.service_url'],
    ],
  ])('should remove %s and keep the rest of the policy', (_, path) => {
    const policy = set(buildPolicy([buildProvider()]), path, 'https://example.com');

    expect(removeDottedResponseActionsKeys(policy)).toEqual(buildPolicy([buildProvider()]));
  });

  it('should keep unrelated dotted keys', () => {
    const expected = set(
      set(policyFactory(), ['windows.malware'], {}),
      ['linux', 'malware.mode'],
      'off'
    );
    const policy = set(cloneDeep(expected), ['windows.response_actions'], {});

    expect(removeDottedResponseActionsKeys(policy)).toEqual(expected);
  });
});
