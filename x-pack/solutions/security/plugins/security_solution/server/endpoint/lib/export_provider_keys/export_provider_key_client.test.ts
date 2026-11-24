/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuditLogger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { auditLoggerMock } from '@kbn/core-security-server-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { nodeBuilder } from '@kbn/es-query';
import type { AzureBlobExportProvider } from '../../../../common/endpoint/types';
import { createSavedObjectsClientFactoryMock } from '../../services/saved_objects/saved_objects_client_factory.mocks';
import { EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE } from './constants';
import type { ExportProviderKeyAttributes, ExportProviderKeyMetadata } from './types';
import type { ExportProviderKeyClientOptions } from './export_provider_key_client';
import { ExportProviderKeyClient } from './export_provider_key_client';

const ACCOUNT_KEY = `${'k'.repeat(86)}==`;
const PACKAGE_POLICY_ID = 'package-policy-1';
const KEY_ID = 'key-1';
const CREATED_AT = '2026-11-01T00:00:00.000Z';

const createProvider = (
  overrides: Partial<AzureBlobExportProvider> = {}
): AzureBlobExportProvider => ({
  id: 'provider-1',
  type: 'azure_blob',
  account_name: 'mystorageaccount',
  container: 'exports',
  credentials: { type: 'account_key', key_id: KEY_ID },
  ...overrides,
});

const createKeyObject = (
  id: string,
  overrides: Partial<ExportProviderKeyAttributes> = {}
): SavedObject<ExportProviderKeyAttributes> => ({
  id,
  type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  references: [],
  attributes: {
    package_policy_id: PACKAGE_POLICY_ID,
    type: 'account_key',
    account_name: 'mystorageaccount',
    account_key: ACCOUNT_KEY,
    created_at: CREATED_AT,
    ...overrides,
  },
});

const createErrorObject = (id: string, statusCode: number): SavedObjectErrorResult => ({
  id,
  type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  error: { statusCode, error: 'Error', message: `status ${statusCode}` },
});

const createFindResponse = (
  savedObjects: Array<SavedObject<ExportProviderKeyAttributes>>,
  total: number,
  page: number
): SavedObjectsFindResponse<ExportProviderKeyAttributes> => ({
  saved_objects: savedObjects.map((so) => ({ ...so, score: 1 })),
  total,
  page,
  per_page: 100,
});

describe('ExportProviderKeyClient', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esoStart: jest.Mocked<EncryptedSavedObjectsPluginStart>;
  let esoClient: jest.Mocked<EncryptedSavedObjectsClient>;
  let auditLogger: jest.Mocked<AuditLogger>;
  let logger: MockedLogger;

  const createClient = (
    overrides: Partial<ExportProviderKeyClientOptions> = {}
  ): ExportProviderKeyClient => {
    const { service: savedObjects } = createSavedObjectsClientFactoryMock();

    jest.mocked(savedObjects.createInternalUnscopedSoClient).mockReturnValue(soClient);

    return new ExportProviderKeyClient({
      savedObjects,
      encryptedSavedObjects: esoStart,
      canEncrypt: true,
      auditLogger,
      logger,
      ...overrides,
    });
  };

  const expectKeyNotLogged = (): void => {
    expect(JSON.stringify(loggerMock.collect(logger))).not.toContain(ACCOUNT_KEY);
    expect(JSON.stringify(auditLogger.log.mock.calls)).not.toContain(ACCOUNT_KEY);
  };

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    esoClient = encryptedSavedObjectsMock.createClient();
    esoStart = encryptedSavedObjectsMock.createStart();
    esoStart.getClient.mockReturnValue(esoClient);
    auditLogger = auditLoggerMock.create();
    logger = loggerMock.create();
  });

  describe('#isEncryptionAvailable()', () => {
    it('is true with the encryptedSavedObjects plugin and an encryption key', () => {
      expect(createClient().isEncryptionAvailable()).toBe(true);
    });

    it('is false without an encryption key', () => {
      expect(createClient({ canEncrypt: false }).isEncryptionAvailable()).toBe(false);
    });

    it('is false without the encryptedSavedObjects plugin', () => {
      expect(createClient({ encryptedSavedObjects: undefined }).isEncryptionAvailable()).toBe(
        false
      );
    });
  });

  describe('#getAccountKey()', () => {
    beforeEach(() => {
      esoClient.getDecryptedAsInternalUser.mockResolvedValue(createKeyObject(KEY_ID));
    });

    it('returns the decrypted key of the referenced object', async () => {
      await expect(createClient().getAccountKey(PACKAGE_POLICY_ID, createProvider())).resolves.toBe(
        ACCOUNT_KEY
      );
      expect(esoStart.getClient).toHaveBeenCalledWith({
        includedHiddenTypes: [EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE],
      });
      expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
        KEY_ID
      );
      expectKeyNotLogged();
    });

    it.each<[string, Partial<ExportProviderKeyClientOptions>, AzureBlobExportProvider]>([
      ['the provider has no reference', {}, createProvider({ credentials: undefined })],
      [
        'the reference has another credential type',
        {},
        createProvider({
          credentials: {
            type: 'other',
            key_id: KEY_ID,
          } as unknown as AzureBlobExportProvider['credentials'],
        }),
      ],
      ['there is no encryption key', { canEncrypt: false }, createProvider()],
      [
        'the encryptedSavedObjects plugin is missing',
        { encryptedSavedObjects: undefined },
        createProvider(),
      ],
    ])('returns undefined without reading the object when %s', async (_, options, provider) => {
      await expect(
        createClient(options).getAccountKey(PACKAGE_POLICY_ID, provider)
      ).resolves.toBeUndefined();
      expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('returns undefined when the object is missing', async () => {
      esoClient.getDecryptedAsInternalUser.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
          KEY_ID
        )
      );

      await expect(
        createClient().getAccountKey(PACKAGE_POLICY_ID, createProvider())
      ).resolves.toBeUndefined();
    });

    it('returns undefined when the object can not be decrypted', async () => {
      esoClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('Unable to decrypt attribute "account_key"')
      );

      await expect(
        createClient().getAccountKey(PACKAGE_POLICY_ID, createProvider())
      ).resolves.toBeUndefined();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('returns undefined when the object belongs to another package policy', async () => {
      esoClient.getDecryptedAsInternalUser.mockResolvedValue(
        createKeyObject(KEY_ID, { package_policy_id: 'another-package-policy' })
      );

      await expect(
        createClient().getAccountKey(PACKAGE_POLICY_ID, createProvider())
      ).resolves.toBeUndefined();
      expectKeyNotLogged();
    });

    it('returns undefined when the object was saved for another storage account', async () => {
      esoClient.getDecryptedAsInternalUser.mockResolvedValue(
        createKeyObject(KEY_ID, { account_name: 'anotheraccount' })
      );

      await expect(
        createClient().getAccountKey(PACKAGE_POLICY_ID, createProvider())
      ).resolves.toBeUndefined();
      expectKeyNotLogged();
    });
  });

  describe('#createAccountKey()', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('creates a key object and returns its id', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-23T10:00:00.000Z'));
      soClient.create.mockResolvedValue(createKeyObject('new-key-id'));

      await expect(
        createClient().createAccountKey({
          packagePolicyId: PACKAGE_POLICY_ID,
          accountName: 'mystorageaccount',
          accountKey: ACCOUNT_KEY,
        })
      ).resolves.toBe('new-key-id');

      expect(soClient.create).toHaveBeenCalledWith(EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, {
        package_policy_id: PACKAGE_POLICY_ID,
        type: 'account_key',
        account_name: 'mystorageaccount',
        account_key: ACCOUNT_KEY,
        created_at: '2026-11-23T10:00:00.000Z',
      });
      expectKeyNotLogged();
    });

    it.each<[string, Partial<ExportProviderKeyClientOptions>]>([
      ['there is no encryption key', { canEncrypt: false }],
      ['the encryptedSavedObjects plugin is missing', { encryptedSavedObjects: undefined }],
    ])('throws without creating anything when %s', async (_, options) => {
      await expect(
        createClient(options).createAccountKey({
          packagePolicyId: PACKAGE_POLICY_ID,
          accountName: 'mystorageaccount',
          accountKey: ACCOUNT_KEY,
        })
      ).rejects.toThrow(
        `Kibana can't store the key: set xpack.encryptedSavedObjects.encryptionKey`
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('#getKeyMetadata()', () => {
    it('returns the metadata of existing objects and leaves out missing ones', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [createKeyObject('key-1'), createErrorObject('key-2', 404)],
      });

      const metadata = await createClient().getKeyMetadata(['key-1', 'key-2', 'key-1']);

      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: 'key-1' },
        { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: 'key-2' },
      ]);
      expect(metadata).toEqual(
        new Map([
          [
            'key-1',
            {
              id: 'key-1',
              package_policy_id: PACKAGE_POLICY_ID,
              account_name: 'mystorageaccount',
              created_at: CREATED_AT,
            },
          ],
        ])
      );
    });

    it('throws when an object can not be read', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [createKeyObject('key-1'), createErrorObject('key-2', 500)],
      });

      await expect(createClient().getKeyMetadata(['key-1', 'key-2'])).rejects.toThrow(
        'Unable to read export provider key [id=key-2]: status 500'
      );
    });
  });

  describe('#findAllKeys()', () => {
    it('yields the metadata of every page and closes the finder', async () => {
      const close = jest.fn();

      soClient.createPointInTimeFinder.mockReturnValue({
        close,
        find: async function* find() {
          yield createFindResponse([createKeyObject('key-1')], 2, 1);
          yield createFindResponse(
            [createKeyObject('key-2', { package_policy_id: 'package-policy-2' })],
            2,
            2
          );
        },
      });

      const batches: ExportProviderKeyMetadata[][] = [];

      for await (const batch of createClient().findAllKeys({ perPage: 1 })) {
        batches.push(batch);
      }

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
        perPage: 1,
      });
      expect(batches).toEqual([
        [
          {
            id: 'key-1',
            package_policy_id: PACKAGE_POLICY_ID,
            account_name: 'mystorageaccount',
            created_at: CREATED_AT,
          },
        ],
        [
          {
            id: 'key-2',
            package_policy_id: 'package-policy-2',
            account_name: 'mystorageaccount',
            created_at: CREATED_AT,
          },
        ],
      ]);
      expect(close).toHaveBeenCalled();
    });
  });

  describe('#deleteKeys()', () => {
    it('deletes every object, audits each delete and continues after a failure', async () => {
      soClient.delete.mockImplementation(async (_, id) => {
        if (id === 'key-2') {
          throw new Error('delete failed');
        }

        if (id === 'key-3') {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(
            EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
            id
          );
        }

        return {};
      });

      await expect(
        createClient().deleteKeys([
          { id: 'key-1', package_policy_id: PACKAGE_POLICY_ID },
          { id: 'key-2', package_policy_id: PACKAGE_POLICY_ID },
          { id: 'key-3', package_policy_id: PACKAGE_POLICY_ID },
          { id: 'key-4', package_policy_id: 'package-policy-2' },
        ])
      ).resolves.toEqual(['key-1', 'key-3', 'key-4']);

      expect(soClient.delete).toHaveBeenCalledTimes(4);
      expect(auditLogger.log.mock.calls.map(([event]) => event)).toEqual([
        {
          message: `Deleted export provider key [id=key-1] of Elastic Defend policy [id=${PACKAGE_POLICY_ID}]`,
          event: {
            action: 'endpoint_export_provider_key_delete',
            category: ['database'],
            type: ['deletion'],
            outcome: 'success',
          },
          kibana: { saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: 'key-1' } },
        },
        {
          message: `Failed to delete export provider key [id=key-2] of Elastic Defend policy [id=${PACKAGE_POLICY_ID}]`,
          event: {
            action: 'endpoint_export_provider_key_delete',
            category: ['database'],
            type: ['deletion'],
            outcome: 'failure',
          },
          kibana: { saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: 'key-2' } },
          error: { code: 'Error', message: 'delete failed' },
        },
        {
          message: `Deleted export provider key [id=key-4] of Elastic Defend policy [id=package-policy-2]`,
          event: {
            action: 'endpoint_export_provider_key_delete',
            category: ['database'],
            type: ['deletion'],
            outcome: 'success',
          },
          kibana: { saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: 'key-4' } },
        },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to delete export provider key [id=key-2] of Elastic Defend policy [id=${PACKAGE_POLICY_ID}]: delete failed`
      );
    });
  });

  describe('#deleteKeysForPackagePolicies()', () => {
    it('does nothing without package policies', async () => {
      await createClient().deleteKeysForPackagePolicies([]);

      expect(soClient.find).not.toHaveBeenCalled();
    });

    it('finds the objects owned by the package policies on every page and deletes them', async () => {
      soClient.find
        .mockResolvedValueOnce(
          createFindResponse(
            Array.from({ length: 100 }, (_, index) => createKeyObject(`key-${index}`)),
            101,
            1
          )
        )
        .mockResolvedValueOnce(
          createFindResponse(
            [createKeyObject('key-100', { package_policy_id: 'package-policy-2' })],
            101,
            2
          )
        );
      soClient.delete.mockResolvedValue({});

      await createClient().deleteKeysForPackagePolicies([PACKAGE_POLICY_ID, 'package-policy-2']);

      const filter = nodeBuilder.or([
        nodeBuilder.is(
          `${EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE}.attributes.package_policy_id`,
          PACKAGE_POLICY_ID
        ),
        nodeBuilder.is(
          `${EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE}.attributes.package_policy_id`,
          'package-policy-2'
        ),
      ]);

      expect(soClient.find).toHaveBeenCalledTimes(2);
      expect(soClient.find).toHaveBeenNthCalledWith(1, {
        type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
        filter,
        perPage: 100,
        page: 1,
      });
      expect(soClient.find).toHaveBeenNthCalledWith(2, {
        type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
        filter,
        perPage: 100,
        page: 2,
      });
      expect(soClient.delete).toHaveBeenCalledTimes(101);
      expect(soClient.delete).toHaveBeenLastCalledWith(
        EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
        'key-100'
      );
    });

    it('never throws', async () => {
      soClient.find.mockRejectedValue(new Error('find failed'));

      await expect(
        createClient().deleteKeysForPackagePolicies([PACKAGE_POLICY_ID])
      ).resolves.toBeUndefined();
      expect(soClient.delete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to delete the export provider keys of Elastic Defend policies [${PACKAGE_POLICY_ID}]: find failed`
      );
    });
  });
});
