/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { MonitorConfigRepository } from './monitor_config_repository';
import { secretKeys } from '../../common/constants/monitor_management';
import { assertSecretsEncapsulated, formatSecrets } from '../synthetics_service/utils';
import type {
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { syntheticsMonitorSavedObjectType } from '../../common/types/saved_objects';

// Deliberately unmocked (unlike monitor_config_repository.test.ts): these tests assert the
// real `formatSecrets` behaviour at the saved object write boundary.

// Derived from `secretKeys` so a newly declared secret is covered without editing this file.
const plaintextSecrets = Object.fromEntries(
  secretKeys.map((key) => [key, `plaintext-value-for-${key}`])
);

const secretKeySet = new Set<string>(secretKeys);

const plaintextMonitor = {
  name: 'Test monitor',
  type: 'http',
  spaces: ['default'],
  ...plaintextSecrets,
} as unknown as SyntheticsMonitor;

const previousMonitor = {
  id: 'test-id',
  type: syntheticsMonitorSavedObjectType,
  namespaces: ['default'],
  attributes: {},
  references: [],
} as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>;

/**
 * `secrets` is the only encrypted attribute on the monitor saved object types, so a secret left at
 * the top level of the attributes is written to Elasticsearch in the clear. Assert both halves:
 * nothing plaintext on the document, and no secret quietly lost on the way into the payload.
 */
const expectSecretsEncapsulated = (
  attributes: Record<string, unknown>,
  expectedSecrets: Record<string, string> = plaintextSecrets
) => {
  expect(Object.keys(attributes).filter((key) => secretKeySet.has(key))).toEqual([]);
  expect(JSON.parse(String(attributes.secrets))).toEqual(expectedSecrets);
};

describe('MonitorConfigRepository secret handling', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: MonitorConfigRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    soClient.bulkCreate.mockResolvedValue({ saved_objects: [] });
    soClient.bulkUpdate.mockResolvedValue({ saved_objects: [] });
    repository = new MonitorConfigRepository(
      soClient,
      encryptedSavedObjectsMock
        .createStart()
        .getClient() as jest.Mocked<EncryptedSavedObjectsClient>
    );
  });

  it('writes no plaintext secret attribute on create', async () => {
    await repository.create({
      id: 'test-id',
      spaceId: 'default',
      normalizedMonitor: plaintextMonitor,
    });

    const [, attributes] = soClient.create.mock.calls[0];
    expectSecretsEncapsulated(attributes as Record<string, unknown>);
  });

  it('writes no plaintext secret attribute on createBulk', async () => {
    await repository.createBulk({
      monitors: [{ id: 'test-id', monitor: plaintextMonitor as never }],
    });

    const [[{ attributes }]] = soClient.bulkCreate.mock.calls[0];
    expectSecretsEncapsulated(attributes as Record<string, unknown>);
  });

  // `update`/`bulkUpdate` take an already-formatted document rather than formatting it
  // themselves, so these pin the contract: the callers' input shape produces a clean write.
  it('writes no plaintext secret attribute on update', async () => {
    await repository.update('test-id', formatSecrets(plaintextMonitor), previousMonitor);

    const [, , attributes] = soClient.update.mock.calls[0];
    expectSecretsEncapsulated(attributes as Record<string, unknown>);
  });

  it('writes no plaintext secret attribute on bulkUpdate', async () => {
    await repository.bulkUpdate({
      monitors: [{ id: 'test-id', attributes: formatSecrets(plaintextMonitor), previousMonitor }],
    });

    const [[{ attributes }]] = soClient.bulkUpdate.mock.calls[0];
    expectSecretsEncapsulated(attributes as Record<string, unknown>);
  });

  describe('when a caller bypasses formatSecrets', () => {
    // The typed signatures make this impossible in TypeScript; the cast reproduces what an
    // `as unknown as` at a call site, or a JS caller, would do.
    const withStrayPassword = {
      ...formatSecrets(plaintextMonitor),
      password: 'leaked-password',
    } as unknown as SyntheticsMonitorWithSecretsAttributes;

    it('refuses the write on update', async () => {
      await expect(
        repository.update('test-id', withStrayPassword, previousMonitor)
      ).rejects.toThrow(/plaintext secret attributes \[password\]/);

      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('refuses the write on bulkUpdate', async () => {
      await expect(
        repository.bulkUpdate({
          monitors: [{ id: 'test-id', attributes: withStrayPassword, previousMonitor }],
        })
      ).rejects.toThrow(/plaintext secret attributes \[password\]/);

      expect(soClient.bulkUpdate).not.toHaveBeenCalled();
    });

    it('names the offending key but never its value', async () => {
      await expect(
        repository.update('test-id', withStrayPassword, previousMonitor)
      ).rejects.toThrow(expect.not.stringContaining('leaked-password'));
    });
  });
});

// Called from the repository write paths and the rollback path in edit_monitor.ts, so it is
// covered directly rather than only through its callers.
describe('assertSecretsEncapsulated', () => {
  it('accepts a correctly formatted monitor', () => {
    expect(() =>
      assertSecretsEncapsulated(formatSecrets(plaintextMonitor), 'test-id')
    ).not.toThrow();
  });

  it('rejects a document with no secrets payload', () => {
    // The write paths replace attributes rather than merging, so this would drop the secrets.
    const { secrets, ...withoutPayload } = formatSecrets(plaintextMonitor);

    expect(() => assertSecretsEncapsulated(withoutPayload, 'test-id')).toThrow(
      /has no 'secrets' payload/
    );
  });

  it('rejects every declared secret key, naming it without its value', () => {
    for (const key of secretKeys) {
      expect(() => assertSecretsEncapsulated({ [key]: 'leaked-value' }, 'test-id')).toThrow(
        new RegExp(`\\[${key.replace(/\./g, '\\.')}\\]`)
      );
      expect(() => assertSecretsEncapsulated({ [key]: 'leaked-value' }, 'test-id')).toThrow(
        expect.not.stringContaining('leaked-value')
      );
    }
  });
});
