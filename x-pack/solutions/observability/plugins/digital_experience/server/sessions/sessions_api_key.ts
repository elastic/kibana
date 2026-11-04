/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreStart,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsType,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type {
  EncryptedSavedObjectTypeRegistration,
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
} from '../../common/sessions';
import { REQUIRED_DEST_INDEX_PRIVILEGES, REQUIRED_SOURCE_INDEX_PRIVILEGES } from './sessions_setup';

export const SESSIONS_API_KEY_SO_TYPE = 'digital-experience-sessions-api-key';
/**
 * Sessions are cluster-wide, so there is one stored key. A UUID, as encrypted saved objects only
 * accept predefined ids that are.
 */
export const SESSIONS_API_KEY_SO_ID = '669aceac-05f5-437a-ad7c-5cc31ecaa83b';
export const SESSIONS_API_KEY_NAME = 'Digital Experience sessions';

/** The key the sessions transforms run with, and who granted it. */
export interface SessionsApiKey {
  id: string;
  name: string;
  apiKey: string;
  grantedBy: string | null;
  grantedAt: string;
}

const sessionsApiKeySchemaV1 = schema.object({
  id: schema.string(),
  name: schema.string(),
  apiKey: schema.string(),
  grantedBy: schema.nullable(schema.string()),
  grantedAt: schema.string(),
});

export const sessionsApiKeySavedObjectType: SavedObjectsType = {
  name: SESSIONS_API_KEY_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: { dynamic: false, properties: {} },
  management: { importableAndExportable: false },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: sessionsApiKeySchemaV1.extends({}, { unknowns: 'ignore' }),
        create: sessionsApiKeySchemaV1,
      },
    },
  },
};

export const sessionsApiKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: SESSIONS_API_KEY_SO_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  // The key's id never changes for a stored key: rotating it replaces the whole object.
  attributesToIncludeInAAD: new Set(['id']),
};

/**
 * What transform secondary credentials need, and nothing else: read the source data and write
 * the sessions index. Elasticsearch also limits the key to what the granting user can do.
 */
export const SESSIONS_API_KEY_ROLE_DESCRIPTORS = {
  digital_experience_sessions: {
    cluster: [],
    indices: [
      { names: [...SESSIONS_SOURCE_INDICES], privileges: [...REQUIRED_SOURCE_INDEX_PRIVILEGES] },
      { names: [SESSIONS_INDEX_PATTERN], privileges: [...REQUIRED_DEST_INDEX_PRIVILEGES] },
    ],
  },
};

/** A request authenticated as the key, so Elasticsearch clients scoped to it act as the key. */
const requestAs = ({ id, apiKey }: SessionsApiKey): KibanaRequest =>
  kibanaRequestFactory({
    headers: { authorization: `ApiKey ${Buffer.from(`${id}:${apiKey}`).toString('base64')}` },
  });

/**
 * Grants, stores and reads the API key the sessions transforms run with, so the health task can
 * update them without a user and without widening their access to the internal user's.
 */
export class SessionsApiKeys {
  constructor(
    private readonly deps: {
      logger: Logger;
      getStartServices: () => Promise<{
        core: CoreStart;
        encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
      }>;
      encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
    }
  ) {}

  /** Stored keys need an encryption key; without one, sessions keep using the user's access. */
  public get available(): boolean {
    return this.deps.encryptedSavedObjects?.canEncrypt === true;
  }

  /**
   * Grants a key on behalf of the user behind `request`, scoped to what the transforms need.
   * Returns null when API keys are disabled in Elasticsearch.
   */
  public async grant(
    request: KibanaRequest,
    { grantedBy, now }: { grantedBy: string | null; now: Date }
  ): Promise<SessionsApiKey | null> {
    const { core } = await this.deps.getStartServices();
    const result = await core.security.authc.apiKeys.grantAsInternalUser(request, {
      name: SESSIONS_API_KEY_NAME,
      role_descriptors: SESSIONS_API_KEY_ROLE_DESCRIPTORS,
      metadata: {
        managed: true,
        managed_by: SESSIONS_MANAGED_BY,
        description: 'Used by the Digital Experience sessions transforms.',
      },
    });
    return result
      ? {
          id: result.id,
          name: result.name,
          apiKey: result.api_key,
          grantedBy,
          grantedAt: now.toISOString(),
        }
      : null;
  }

  /** The stored key, or null when there is none or this Kibana can't decrypt it. */
  public async get(): Promise<SessionsApiKey | null> {
    if (!this.available) {
      return null;
    }
    const { encryptedSavedObjects } = await this.deps.getStartServices();
    if (!encryptedSavedObjects) {
      return null;
    }
    try {
      const { attributes } = await encryptedSavedObjects
        .getClient({ includedHiddenTypes: [SESSIONS_API_KEY_SO_TYPE] })
        .getDecryptedAsInternalUser<SessionsApiKey>(
          SESSIONS_API_KEY_SO_TYPE,
          SESSIONS_API_KEY_SO_ID
        );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return null;
      }
      if (encryptedSavedObjects.isEncryptionError(error)) {
        this.deps.logger.warn(
          `Could not decrypt the sessions API key, so sessions need a manual update: ${error.message}`
        );
        return null;
      }
      throw error;
    }
  }

  public async save(key: SessionsApiKey): Promise<void> {
    await (
      await this.soClient()
    ).create(SESSIONS_API_KEY_SO_TYPE, key, {
      id: SESSIONS_API_KEY_SO_ID,
      overwrite: true,
    });
  }

  /** Deletes the stored key, if any. Doesn't invalidate it. */
  public async delete(): Promise<void> {
    try {
      await (await this.soClient()).delete(SESSIONS_API_KEY_SO_TYPE, SESSIONS_API_KEY_SO_ID);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
  }

  /** Invalidates a key, logging rather than throwing, as a leftover key only grants reads. */
  public async invalidate(key: Pick<SessionsApiKey, 'id' | 'name'>): Promise<void> {
    const { core } = await this.deps.getStartServices();
    try {
      await core.security.authc.apiKeys.invalidateAsInternalUser({ ids: [key.id] });
    } catch (error) {
      this.deps.logger.warn(
        `Could not invalidate sessions API key [${key.name}] (${key.id}): ${error.message}`
      );
    }
  }

  /** Whether Elasticsearch still accepts the key: false once invalidated or expired. */
  public async isValid(key: SessionsApiKey): Promise<boolean> {
    const { core } = await this.deps.getStartServices();
    return core.security.authc.apiKeys.validate({ id: key.id, api_key: key.apiKey });
  }

  /**
   * A cluster client acting as the key: `asCurrentUser` authenticates as the key, and
   * `asSecondaryAuthUser` sends it as the secondary credentials that transforms run with.
   */
  public async clusterClientFor(key: SessionsApiKey): Promise<IScopedClusterClient> {
    const { core } = await this.deps.getStartServices();
    return core.elasticsearch.client.asScoped(requestAs(key));
  }

  private async soClient() {
    const { core } = await this.deps.getStartServices();
    return core.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [SESSIONS_API_KEY_SO_TYPE],
    });
  }
}
