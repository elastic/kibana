/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import type { ExportProvider } from '../../../../common/endpoint/types';

/** Attributes of an `EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE` object. The object is never updated. */
export interface ExportProviderKeyAttributes {
  /** Owner package policy. In AAD. Mapped, to find and delete keys by owner */
  package_policy_id: string;
  /** In AAD */
  type: 'account_key';
  /** The Azure storage account the key was saved for. In AAD */
  account_name: string;
  /** Encrypted */
  account_key: string;
  /** ISO timestamp; not in AAD */
  created_at: string;
}

/** What can be read about a key object without decrypting it */
export interface ExportProviderKeyMetadata {
  id: string;
  package_policy_id: string;
  /** The storage account the key was saved for (in AAD, so stored in clear) */
  account_name: string;
  created_at: string;
}

/** Read side for response actions (elastic/security-team#19494 part 2) */
export interface ExportProviderKeyService {
  /**
   * The decrypted key for `provider`, or `undefined` when the provider has no reference, the object is
   * missing, it belongs to another package policy, its `account_name` differs from the provider's,
   * or encryption is unavailable. Never throws for those cases; logs at debug.
   */
  getAccountKey(packagePolicyId: string, provider: ExportProvider): Promise<string | undefined>;
}

/**
 * Server-internal access to the key objects, used by the key route, the package policy callbacks
 * and the cleanup task. Reads and deletes go through the internal (unscoped) saved objects client.
 */
export interface ExportProviderKeyClientInterface extends ExportProviderKeyService {
  /** `false` without the encryptedSavedObjects plugin or without `xpack.encryptedSavedObjects.encryptionKey` */
  isEncryptionAvailable(): boolean;

  /**
   * Creates a new key object (`type: 'account_key'`, `created_at: now`) and returns its id. Objects
   * are never updated. Throws when encryption is unavailable. Never logs the key.
   */
  createAccountKey(options: {
    packagePolicyId: string;
    accountName: string;
    accountKey: string;
  }): Promise<string>;

  /** Metadata of the given key objects. Ids that don't exist are left out; other errors throw. */
  getKeyMetadata(ids: readonly string[]): Promise<Map<string, ExportProviderKeyMetadata>>;

  /** Pages through every key object (metadata only, all spaces), one batch per page. */
  findAllKeys(options?: { perPage?: number }): AsyncGenerator<ExportProviderKeyMetadata[]>;

  /**
   * Deletes the given key objects one by one and audits each delete
   * (`endpoint_export_provider_key_delete`) with `options.auditLogger`, or without a request when it
   * isn't given. Never throws: a failure is audited and logged at warn, and the rest continue. An
   * object that is already gone counts as deleted. Returns the deleted ids.
   */
  deleteKeys(
    keys: ReadonlyArray<Pick<ExportProviderKeyMetadata, 'id' | 'package_policy_id'>>,
    options?: ExportProviderKeyDeleteOptions
  ): Promise<string[]>;

  /** Finds and deletes (as `deleteKeys`) every key object owned by these package policies. Never throws. */
  deleteKeysForPackagePolicies(
    packagePolicyIds: readonly string[],
    options?: ExportProviderKeyDeleteOptions
  ): Promise<void>;
}

export interface ExportProviderKeyDeleteOptions {
  /** Audits the deletes for this logger's user, e.g. `security.audit.asScoped(request)` */
  auditLogger?: AuditLogger;
}
