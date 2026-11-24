/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuditEvent,
  AuditLogger,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers, isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { nodeBuilder } from '@kbn/es-query';
import type { ExportProvider } from '../../../../common/endpoint/types';
import { EndpointError } from '../../../../common/endpoint/errors';
import type { SavedObjectsClientFactory } from '../../services/saved_objects';
import {
  EXPORT_PROVIDER_KEY_DELETE_AUDIT_ACTION,
  EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
} from './constants';
import type {
  ExportProviderKeyAttributes,
  ExportProviderKeyClientInterface,
  ExportProviderKeyMetadata,
} from './types';

export interface ExportProviderKeyClientOptions {
  savedObjects: SavedObjectsClientFactory;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart | undefined;
  /** `canEncrypt` of the encryptedSavedObjects setup contract */
  canEncrypt: boolean;
  auditLogger: AuditLogger | undefined;
  logger: Logger;
}

type KeyToDelete = Pick<ExportProviderKeyMetadata, 'id' | 'package_policy_id'>;

const FIND_PER_PAGE = 100;

const toMetadata = ({
  id,
  attributes: {
    package_policy_id: packagePolicyId,
    account_name: accountName,
    created_at: createdAt,
  },
}: SavedObject<ExportProviderKeyAttributes>): ExportProviderKeyMetadata => ({
  id,
  package_policy_id: packagePolicyId,
  account_name: accountName,
  created_at: createdAt,
});

/**
 * Stores and reads the encrypted storage account keys of export providers. Writes go through the
 * internal saved objects client, which keeps the encryption extension (the key is encrypted at rest).
 */
export class ExportProviderKeyClient implements ExportProviderKeyClientInterface {
  private readonly soClient: SavedObjectsClientContract;
  private readonly esoClient: EncryptedSavedObjectsClient | undefined;
  private readonly canEncrypt: boolean;
  private readonly auditLogger: AuditLogger | undefined;
  private readonly logger: Logger;

  constructor({
    savedObjects,
    encryptedSavedObjects,
    canEncrypt,
    auditLogger,
    logger,
  }: ExportProviderKeyClientOptions) {
    this.soClient = savedObjects.createInternalUnscopedSoClient(false);
    this.esoClient = encryptedSavedObjects?.getClient({
      includedHiddenTypes: [EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE],
    });
    this.canEncrypt = canEncrypt;
    this.auditLogger = auditLogger;
    this.logger = logger;
  }

  public isEncryptionAvailable(): boolean {
    return this.canEncrypt && this.esoClient !== undefined;
  }

  public async createAccountKey({
    packagePolicyId,
    accountName,
    accountKey,
  }: {
    packagePolicyId: string;
    accountName: string;
    accountKey: string;
  }): Promise<string> {
    if (!this.isEncryptionAvailable()) {
      throw new EndpointError(
        `Kibana can't store the key: set xpack.encryptedSavedObjects.encryptionKey`
      );
    }

    const { id } = await this.soClient.create<ExportProviderKeyAttributes>(
      EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
      {
        package_policy_id: packagePolicyId,
        type: 'account_key',
        account_name: accountName,
        account_key: accountKey,
        created_at: new Date().toISOString(),
      }
    );

    this.logger.debug(
      `Created export provider key [id=${id}] for Elastic Defend policy [id=${packagePolicyId}]`
    );

    return id;
  }

  public async getAccountKey(
    packagePolicyId: string,
    provider: ExportProvider
  ): Promise<string | undefined> {
    const logNoKey = (reason: string): undefined => {
      this.logger.debug(
        `No usable key for export provider [id=${provider.id}] of Elastic Defend policy [id=${packagePolicyId}]: ${reason}`
      );
      return undefined;
    };
    const { credentials } = provider;

    if (!credentials || credentials.type !== 'account_key') {
      return logNoKey('the provider has no account key reference');
    }

    const { key_id: keyId } = credentials;

    if (!this.esoClient || !this.canEncrypt) {
      return logNoKey(`encryption is unavailable (key [id=${keyId}])`);
    }

    let attributes: ExportProviderKeyAttributes;

    try {
      const keyObject =
        await this.esoClient.getDecryptedAsInternalUser<ExportProviderKeyAttributes>(
          EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
          keyId
        );
      attributes = keyObject.attributes;
    } catch (error) {
      return logNoKey(`key [id=${keyId}] could not be read: ${error.message}`);
    }

    if (attributes.package_policy_id !== packagePolicyId) {
      return logNoKey(
        `key [id=${keyId}] belongs to Elastic Defend policy [id=${attributes.package_policy_id}]`
      );
    }

    if (attributes.account_name !== provider.account_name) {
      return logNoKey(
        `key [id=${keyId}] was saved for another storage account [${attributes.account_name}]`
      );
    }

    return attributes.account_key;
  }

  public async getKeyMetadata(
    ids: readonly string[]
  ): Promise<Map<string, ExportProviderKeyMetadata>> {
    const metadata = new Map<string, ExportProviderKeyMetadata>();
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return metadata;
    }

    const { saved_objects: savedObjects } =
      await this.soClient.bulkGet<ExportProviderKeyAttributes>(
        uniqueIds.map((id) => ({ type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id }))
      );

    for (const savedObject of savedObjects) {
      if (!isSavedObjectErrorResult(savedObject)) {
        metadata.set(savedObject.id, toMetadata(savedObject));
      } else if (savedObject.error.statusCode !== 404) {
        throw new EndpointError(
          `Unable to read export provider key [id=${savedObject.id}]: ${savedObject.error.message}`,
          savedObject.error
        );
      }
    }

    return metadata;
  }

  public async *findAllKeys({ perPage = FIND_PER_PAGE }: { perPage?: number } = {}): AsyncGenerator<
    ExportProviderKeyMetadata[]
  > {
    const finder = this.soClient.createPointInTimeFinder<ExportProviderKeyAttributes>({
      type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
      perPage,
    });

    try {
      for await (const { saved_objects: savedObjects } of finder.find()) {
        yield savedObjects.map(toMetadata);
      }
    } finally {
      await finder.close();
    }
  }

  public async deleteKeys(keys: readonly KeyToDelete[]): Promise<string[]> {
    const deletedIds: string[] = [];

    for (const { id, package_policy_id: packagePolicyId } of keys) {
      try {
        await this.soClient.delete(EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id);
        deletedIds.push(id);
        this.auditLogger?.log(
          this.createDeleteAuditEvent({ id, packagePolicyId, outcome: 'success' })
        );
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          deletedIds.push(id);
          this.logger.debug(
            `Export provider key [id=${id}] of Elastic Defend policy [id=${packagePolicyId}] was already deleted`
          );
        } else {
          this.auditLogger?.log(
            this.createDeleteAuditEvent({ id, packagePolicyId, outcome: 'failure', error })
          );
          this.logger.warn(
            `Failed to delete export provider key [id=${id}] of Elastic Defend policy [id=${packagePolicyId}]: ${error.message}`
          );
        }
      }
    }

    return deletedIds;
  }

  public async deleteKeysForPackagePolicies(packagePolicyIds: readonly string[]): Promise<void> {
    if (packagePolicyIds.length === 0) {
      return;
    }

    try {
      const filter = nodeBuilder.or(
        packagePolicyIds.map((packagePolicyId) =>
          nodeBuilder.is(
            `${EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE}.attributes.package_policy_id`,
            packagePolicyId
          )
        )
      );
      const keys: KeyToDelete[] = [];

      for (let page = 1; ; page++) {
        const { saved_objects: savedObjects, total } =
          await this.soClient.find<ExportProviderKeyAttributes>({
            type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
            filter,
            perPage: FIND_PER_PAGE,
            page,
          });

        keys.push(...savedObjects.map(toMetadata));

        if (savedObjects.length === 0 || page * FIND_PER_PAGE >= total) {
          break;
        }
      }

      await this.deleteKeys(keys);
    } catch (error) {
      this.logger.warn(
        `Failed to delete the export provider keys of Elastic Defend policies [${packagePolicyIds.join(
          ', '
        )}]: ${error.message}`
      );
    }
  }

  private createDeleteAuditEvent({
    id,
    packagePolicyId,
    outcome,
    error,
  }: {
    id: string;
    packagePolicyId: string;
    outcome: 'success' | 'failure';
    error?: Error;
  }): AuditEvent {
    return {
      message:
        outcome === 'success'
          ? `Deleted export provider key [id=${id}] of Elastic Defend policy [id=${packagePolicyId}]`
          : `Failed to delete export provider key [id=${id}] of Elastic Defend policy [id=${packagePolicyId}]`,
      event: {
        action: EXPORT_PROVIDER_KEY_DELETE_AUDIT_ACTION,
        category: ['database'],
        type: ['deletion'],
        outcome,
      },
      kibana: {
        saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id },
      },
      ...(error ? { error: { code: error.name, message: error.message } } : {}),
    };
  }
}
