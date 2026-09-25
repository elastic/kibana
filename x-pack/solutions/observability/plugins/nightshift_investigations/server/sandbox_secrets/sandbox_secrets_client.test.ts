/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_SECRETS_SO_TYPE } from '../saved_objects';
import { createSandboxSecretsClient } from './sandbox_secrets_client';
import {
  SandboxSecretsConflictError,
  SandboxSecretsDisabledError,
  SandboxSecretsUnavailableError,
  SandboxSecretsValidationError,
} from './errors';

const STORED_ID = 'stored-secrets-id';

const setup = ({
  canEncrypt = true,
  storedValues,
  spaceId = 'default',
  withSecurity = true,
  useRbac = true,
  hasReadPrivilege = true,
  nightshiftEnabled = true,
}: {
  canEncrypt?: boolean;
  storedValues?: Record<string, string>;
  spaceId?: string;
  withSecurity?: boolean;
  useRbac?: boolean;
  hasReadPrivilege?: boolean;
  nightshiftEnabled?: boolean;
} = {}) => {
  const featureFlags = coreMock.createStart().featureFlags;
  featureFlags.getBooleanValue.mockImplementation(async (flag) =>
    flag === NIGHTSHIFT_ENABLED_FLAG ? nightshiftEnabled : false
  );

  const savedObjects = savedObjectsServiceMock.createStartContract();
  const soClient = savedObjectsClientMock.create();
  soClient.asScopedToNamespace.mockReturnValue(soClient);
  savedObjects.getScopedClient.mockReturnValue(soClient);
  soClient.find.mockResolvedValue({
    page: 1,
    per_page: 1,
    total: storedValues ? 1 : 0,
    saved_objects: storedValues
      ? [
          {
            id: STORED_ID,
            type: NIGHTSHIFT_SECRETS_SO_TYPE,
            references: [],
            version: 'v1',
            score: 0,
            attributes: { keys: Object.keys(storedValues) },
          },
        ]
      : [],
  });

  const getDecryptedAsInternalUser = jest.fn(async () => {
    if (!storedValues) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        STORED_ID
      );
    }
    return { attributes: { keys: Object.keys(storedValues), values: storedValues } };
  });
  const encryptedSavedObjects = {
    getClient: jest.fn(() => ({ getDecryptedAsInternalUser })),
    isEncryptionError: jest.fn(() => false),
  } as unknown as jest.Mocked<EncryptedSavedObjectsPluginStart>;

  const spaces = {
    spacesService: { getSpaceId: jest.fn(() => spaceId) },
  } as unknown as SpacesPluginStart;

  const checkPrivileges = jest.fn(async () => ({ hasAllRequested: hasReadPrivilege }));
  const security = {
    authz: {
      mode: { useRbacForRequest: jest.fn(() => useRbac) },
      checkPrivilegesDynamicallyWithRequest: jest.fn(() => checkPrivileges),
      actions: { api: { get: (operation: string) => `api:${operation}` } },
    },
  } as unknown as SecurityPluginStart;

  const client = createSandboxSecretsClient({
    getDeps: () => ({
      featureFlags,
      savedObjects,
      encryptedSavedObjects,
      spaces,
      security: withSecurity ? security : undefined,
    }),
    canEncrypt,
    logger: loggingSystemMock.createLogger(),
  });

  const request = httpServerMock.createKibanaRequest();

  return {
    client,
    soClient,
    savedObjects,
    getDecryptedAsInternalUser,
    encryptedSavedObjects,
    checkPrivileges,
    request,
  };
};

describe('createSandboxSecretsClient', () => {
  describe('listKeys', () => {
    it('returns stored keys and version without decrypting', async () => {
      const { client, soClient, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value' },
      });

      await expect(client.listKeys(request)).resolves.toEqual({
        keys: ['A_KEY'],
        version: 'v1',
        canEncrypt: true,
      });
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: NIGHTSHIFT_SECRETS_SO_TYPE, perPage: 1 })
      );
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('returns an empty list when nothing is stored', async () => {
      const { client, request } = setup();

      await expect(client.listKeys(request)).resolves.toEqual({ keys: [], canEncrypt: true });
    });

    it('scopes the saved objects client to the request space', async () => {
      const { client, soClient, savedObjects, request } = setup({ spaceId: 'team-a' });

      await client.listKeys(request);

      expect(savedObjects.getScopedClient).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ includedHiddenTypes: [NIGHTSHIFT_SECRETS_SO_TYPE] })
      );
      expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('team-a');
    });
  });

  describe('when the nightshift.enabled flag is off', () => {
    it('refuses to list or replace secrets', async () => {
      const { client, soClient, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        nightshiftEnabled: false,
      });

      await expect(client.listKeys(request)).rejects.toBeInstanceOf(SandboxSecretsDisabledError);
      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'value-456' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsDisabledError);
      expect(soClient.find).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('refuses sandbox access without decrypting', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        nightshiftEnabled: false,
      });

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        errorMessage: expect.stringContaining('Nightshift is not enabled'),
      });
      await expect(client.listKeysForSandbox(request)).resolves.toEqual([]);
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('still returns redaction values', async () => {
      const { client, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        nightshiftEnabled: false,
      });

      await expect(client.getRedactionValues(request)).resolves.toEqual(['value-123']);
    });
  });

  describe('replaceEntries', () => {
    it('keeps stored values for entries without a value, overwrites and deletes the rest', async () => {
      const { client, soClient, request } = setup({
        storedValues: { KEEP: 'kept-value', REPLACE: 'old-value', DROP: 'dropped-value' },
      });
      soClient.create.mockResolvedValue({
        id: STORED_ID,
        type: NIGHTSHIFT_SECRETS_SO_TYPE,
        references: [],
        version: 'v2',
        attributes: {},
      });

      const result = await client.replaceEntries(request, {
        entries: [
          { key: 'KEEP' },
          { key: 'REPLACE', value: 'new-value' },
          { key: 'ADD', value: 'added-secret' },
        ],
        version: 'v1',
      });

      expect(result).toEqual({ keys: ['KEEP', 'REPLACE', 'ADD'], version: 'v2' });
      expect(soClient.create).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        {
          keys: ['KEEP', 'REPLACE', 'ADD'],
          values: { KEEP: 'kept-value', REPLACE: 'new-value', ADD: 'added-secret' },
        },
        { id: STORED_ID, overwrite: true, version: 'v1' }
      );
      expect(JSON.stringify(result)).not.toContain('value');
    });

    it('creates a new object with a generated id when nothing is stored yet', async () => {
      const { client, soClient, getDecryptedAsInternalUser, request } = setup();
      soClient.create.mockResolvedValue({
        id: 'generated-id',
        type: NIGHTSHIFT_SECRETS_SO_TYPE,
        references: [],
        version: 'v1',
        attributes: {},
      });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'value-123' }] })
      ).resolves.toEqual({ keys: ['A_KEY'], version: 'v1' });
      expect(soClient.create).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        { keys: ['A_KEY'], values: { A_KEY: 'value-123' } },
        undefined
      );
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('requires a value for keys that have none stored', async () => {
      const { client, soClient, request } = setup({ storedValues: { OLD_NAME: 'secret' } });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'NEW_NAME' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it.each([['PATH'], ['CONNECTOR_TOKEN'], ['lower_case'], ['1STARTS_WITH_DIGIT'], ['']])(
      'rejects the invalid key %p',
      async (key) => {
        const { client, request } = setup({ storedValues: {} });

        await expect(
          client.replaceEntries(request, { entries: [{ key, value: 'value-123' }] })
        ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
      }
    );

    it('rejects values too short to be redacted', async () => {
      const { client, soClient, request } = setup({ storedValues: {} });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'short' }] })
      ).rejects.toThrow('at least 8 characters');
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rejects values over the maximum length', async () => {
      const { client, soClient, request } = setup({ storedValues: {} });

      await expect(
        client.replaceEntries(request, {
          entries: [{ key: 'A_KEY', value: 'a'.repeat(16385) }],
        })
      ).rejects.toThrow('at most 16384 characters');
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate keys', async () => {
      const { client, request } = setup({ storedValues: {} });

      await expect(
        client.replaceEntries(request, {
          entries: [
            { key: 'DUP', value: 'value-aaa' },
            { key: 'DUP', value: 'value-bbb' },
          ],
        })
      ).rejects.toThrow('listed more than once');
    });

    it('fails when encryption is unavailable', async () => {
      const { client, request } = setup({ canEncrypt: false, storedValues: {} });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'value-123' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsUnavailableError);
    });

    it('maps saved object version conflicts to a conflict error', async () => {
      const { client, soClient, request } = setup({ storedValues: {} });
      soClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(NIGHTSHIFT_SECRETS_SO_TYPE, STORED_ID)
      );

      await expect(
        client.replaceEntries(request, {
          entries: [{ key: 'A_KEY', value: 'value-123' }],
          version: 'v0',
        })
      ).rejects.toBeInstanceOf(SandboxSecretsConflictError);
    });

    it('requires every value to be re-entered when stored values cannot be decrypted', async () => {
      const { client, getDecryptedAsInternalUser, encryptedSavedObjects, request } = setup({
        storedValues: { A_KEY: 'v' },
      });
      getDecryptedAsInternalUser.mockRejectedValue(new Error('Unable to decrypt'));
      encryptedSavedObjects.isEncryptionError.mockReturnValue(true);

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
    });
  });

  describe('resolveForCommand', () => {
    it('returns only the requested secrets and marks them for redaction', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        spaceId: 'team-a',
        storedValues: {
          GITHUB_TOKEN: 'ghp_long_secret',
          SECOND: 'second-value',
          OTHER: 'other-value',
        },
      });

      await expect(client.resolveForCommand(request, ['GITHUB_TOKEN', 'SECOND'])).resolves.toEqual({
        env: { GITHUB_TOKEN: 'ghp_long_secret', SECOND: 'second-value' },
        secretValues: ['ghp_long_secret', 'second-value'],
      });
      expect(getDecryptedAsInternalUser).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        STORED_ID,
        { namespace: 'team-a' }
      );
    });

    it('uses no namespace for the default space', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
      });

      await client.resolveForCommand(request, ['A_KEY']);

      expect(getDecryptedAsInternalUser).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        STORED_ID,
        { namespace: undefined }
      );
    });

    it('reports unknown keys together with the available ones', async () => {
      const { client, request } = setup({ storedValues: { A_KEY: 'value-123' } });

      const result = await client.resolveForCommand(request, ['MISSING']);

      expect(result).toEqual({
        errorMessage: expect.stringContaining('Unknown sandbox secret(s): MISSING'),
      });
      expect(result).toEqual({ errorMessage: expect.stringContaining('Available secrets: A_KEY') });
      expect(JSON.stringify(result)).not.toContain('value-123');
    });

    it('reports no available secrets when nothing is stored', async () => {
      const { client, request } = setup();

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        errorMessage: expect.stringContaining('Available secrets: none'),
      });
    });

    it('reports an error when encryption is unavailable', async () => {
      const { client, request } = setup({ canEncrypt: false, storedValues: { A_KEY: 'v' } });

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        errorMessage: expect.stringContaining('Sandbox secrets are unavailable'),
      });
    });

    it('refuses users without the Nightshift read privilege without decrypting', async () => {
      const { client, getDecryptedAsInternalUser, checkPrivileges, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        hasReadPrivilege: false,
      });

      const result = await client.resolveForCommand(request, ['A_KEY']);

      expect(result).toEqual({
        errorMessage: expect.stringContaining('require the Nightshift read privilege'),
      });
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.read}`],
      });
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('refuses when the security plugin is unavailable', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        withSecurity: false,
      });

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        errorMessage: expect.stringContaining('security plugin is not available'),
      });
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('skips the privilege check when RBAC does not apply to the request', async () => {
      const { client, checkPrivileges, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        useRbac: false,
        hasReadPrivilege: false,
      });

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        env: { A_KEY: 'value-123' },
        secretValues: ['value-123'],
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
    });
  });

  describe('listKeysForSandbox', () => {
    it('returns the stored keys without decrypting', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123', B_KEY: 'value-456' },
      });

      await expect(client.listKeysForSandbox(request)).resolves.toEqual(['A_KEY', 'B_KEY']);
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('returns no keys for users without the Nightshift read privilege', async () => {
      const { client, soClient, request } = setup({
        storedValues: { A_KEY: 'value-123' },
        hasReadPrivilege: false,
      });

      await expect(client.listKeysForSandbox(request)).resolves.toEqual([]);
      expect(soClient.find).not.toHaveBeenCalled();
    });
  });

  describe('getRedactionValues', () => {
    it('returns every stored value regardless of the Nightshift read privilege', async () => {
      const { client, checkPrivileges, request } = setup({
        storedValues: { A_KEY: 'value-123', B_KEY: 'value-456' },
        hasReadPrivilege: false,
      });

      await expect(client.getRedactionValues(request)).resolves.toEqual(['value-123', 'value-456']);
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    it('returns no values when nothing is stored', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup();

      await expect(client.getRedactionValues(request)).resolves.toEqual([]);
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('decrypts at most once per request, shared with resolveForCommand for the same call', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
      });

      await Promise.all([
        client.getRedactionValues(request),
        client.resolveForCommand(request, ['A_KEY']),
      ]);
      expect(getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('decrypts again for a separate request, never caching beyond a single request', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
      });
      const otherRequest = httpServerMock.createKibanaRequest();

      await client.getRedactionValues(request);
      await client.getRedactionValues(otherRequest);
      expect(getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
    });

    it('throws when stored values cannot be decrypted', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
      });
      getDecryptedAsInternalUser.mockRejectedValue(new Error('Unable to decrypt'));

      await expect(client.getRedactionValues(request)).rejects.toThrow('Unable to decrypt');
    });
  });
});
