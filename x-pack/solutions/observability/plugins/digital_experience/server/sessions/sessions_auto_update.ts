/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AuditLogger, IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type {
  SessionsSettings,
  SessionsStatus,
  SessionsTransformAuthorization,
} from '../../common/sessions';
import { describeError } from '../lib/helpers/errors';
import type { SessionsApiKey, SessionsApiKeys } from './sessions_api_key';
import { SESSIONS_API_KEY_NAME } from './sessions_api_key';
import { checkSessionsPrivileges, installSessions } from './sessions_setup';

/**
 * Whether a failed grant means this caller or cluster can't grant keys at all, such as a caller
 * authenticated with an API key or API keys disabled in Elasticsearch, rather than a failure that
 * may pass, such as Elasticsearch being briefly unavailable.
 */
const cannotGrant = (error: unknown): boolean => {
  if (isResponseError(error)) {
    const { statusCode } = error;
    return statusCode != null && statusCode < 500 && statusCode !== 429;
  }
  // Kibana refuses some credentials itself, before asking Elasticsearch.
  return !(error instanceof errors.ElasticsearchClientError);
};

/**
 * A new key for the transforms, or null to fall back to the user's own credentials. Throws when
 * the grant may work on a retry, so a passing failure doesn't drop the stored key.
 */
const grantKey = async ({
  apiKeys,
  request,
  enabledBy,
  now,
  logger,
}: {
  apiKeys: SessionsApiKeys;
  request: KibanaRequest;
  enabledBy: string | null;
  now: Date;
  logger: Logger;
}): Promise<SessionsApiKey | null> => {
  if (!apiKeys.available) {
    return null;
  }
  try {
    const key = await apiKeys.grant(request, { grantedBy: enabledBy, now });
    if (!key) {
      logger.warn('Security is disabled, so sessions will need a manual update after upgrades.');
    }
    return key;
  } catch (error) {
    if (!cannotGrant(error)) {
      throw error;
    }
    logger.warn(
      `Could not grant an API key for the sessions transforms, so they will need a manual update after upgrades: ${describeError(
        error
      )}`
    );
    return null;
  }
};

/**
 * Enables sessions for the user behind `request`. When Kibana can store an API key, the
 * transforms run with a new key granted on the user's behalf, which replaces and invalidates the
 * previous one; otherwise they run with the user's own credentials, as before stored keys.
 * Returns the key the transforms now run with, if any.
 */
export const enableSessionsForUser = async ({
  esClient,
  apiKeys,
  request,
  logger,
  settings,
  enabledBy,
  isServerless,
  now = new Date(),
}: {
  /** Scoped to the user behind `request`. */
  esClient: IScopedClusterClient;
  apiKeys: SessionsApiKeys;
  request: KibanaRequest;
  logger: Logger;
  settings: SessionsSettings;
  enabledBy: string | null;
  /** Serverless also needs `read_security` for the document- and field-level check. */
  isServerless: boolean;
  now?: Date;
}): Promise<SessionsApiKey | null> => {
  // As the user: the key's own privileges can't answer the document- and field-level check.
  await checkSessionsPrivileges(esClient.asCurrentUser, { isServerless });

  const stored = await apiKeys.getStored();
  const previous = stored?.key ?? null;
  const key = await grantKey({ apiKeys, request, enabledBy, now, logger });
  const enabled = { enabledBy, enabledAt: now.toISOString() };

  if (!key) {
    await installSessions({ esClient, logger, settings, enabled });
    if (stored) {
      // The transforms no longer run with it, so the health task mustn't put it back.
      await apiKeys.delete();
      if (previous) {
        await apiKeys.invalidate(previous);
      }
    }
    return null;
  }

  try {
    await installSessions({
      esClient: await apiKeys.clusterClientFor(key),
      logger,
      settings,
      enabled,
    });
  } catch (error) {
    await apiKeys.invalidate(key);
    throw error;
  }
  try {
    await apiKeys.save(key, stored);
  } catch (error) {
    // Enabling succeeded, but nothing would track the new key, so it goes. The transforms keep
    // the identity they were just updated with; only automatic updates are lost.
    await apiKeys.invalidate(key);
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      // An enable that ran at the same time stored its key and replaces `previous` itself. If the
      // transforms ended up with this key, the health task moves them to the stored one.
      logger.info(
        'Sessions were enabled again at the same time, so the API key that stored first is kept.'
      );
      return null;
    }
    logger.error(
      `Could not store the sessions API key, so sessions will need a manual update after upgrades: ${describeError(
        error
      )}`
    );
    if (stored) {
      // The previous key must not come back either.
      await apiKeys.delete();
      if (previous) {
        await apiKeys.invalidate(previous);
      }
    }
    return null;
  }
  if (previous && previous.id !== key.id) {
    await apiKeys.invalidate(previous);
  }
  return key;
};

/** What the health task's last run found about automatic updates. */
export interface SessionsAutoUpdateState {
  /** Why its last automatic update failed, if it did. */
  autoUpdateError?: string;
  /** The stored key it found invalidated, so it isn't checked again. */
  invalidApiKeyId?: string;
}

interface KeyInUse {
  key: SessionsApiKey;
  /**
   * Other sessions keys some transforms run with, such as after two enables at the same time:
   * they belong on the stored key.
   */
  strayKeys: Array<{ id: string; name: string }>;
}

const sessionsKeyIdOf = (authorization: SessionsTransformAuthorization | null): string | null =>
  authorization?.apiKeyName === SESSIONS_API_KEY_NAME ? authorization.apiKeyId : null;

/** The stored key, if the installed transforms run with it or with another sessions key. */
const keyInUse = async (
  status: SessionsStatus,
  apiKeys: SessionsApiKeys
): Promise<KeyInUse | null> => {
  if (!status.installed || !apiKeys.available) {
    return null;
  }
  const key = await apiKeys.get();
  const latestKeyId = status.authorization?.apiKeyId;
  if (!key || (latestKeyId !== key.id && sessionsKeyIdOf(status.authorization) == null)) {
    return null;
  }
  const strayKeyIds = new Set(
    status.transforms
      .map(({ authorization }) => sessionsKeyIdOf(authorization))
      .filter((id): id is string => id != null && id !== key.id)
  );
  return {
    key,
    strayKeys: [...strayKeyIds].map((id) => ({ id, name: SESSIONS_API_KEY_NAME })),
  };
};

const AUTO_UPDATE_FAILED_REASON =
  'The last automatic update of the sessions transforms failed (see the Kibana server logs); enable sessions again to apply it.';

const invalidKeyReason = (key: SessionsApiKey) =>
  `The API key [${key.name}] that Kibana updates the sessions transforms with was invalidated or has expired, so this update can't apply automatically; enable sessions again to apply it and grant a new key.`;

/**
 * Adds what the stored API key means for `status`, and returns the stored key's id. See
 * `withApiKeyStatus`.
 */
export const getApiKeyStatus = async (
  status: SessionsStatus,
  apiKeys: SessionsApiKeys,
  {
    checkKey,
    logger,
    getAutoUpdateState,
  }: {
    checkKey: boolean;
    logger: Logger;
    /** Read only when the transforms run with the stored key. */
    getAutoUpdateState?: () => Promise<SessionsAutoUpdateState>;
  }
): Promise<{ status: SessionsStatus; keyId: string | null }> => {
  try {
    const inUse = await keyInUse(status, apiKeys);
    if (!inUse) {
      return { status, keyId: null };
    }
    const { key } = inUse;
    const { autoUpdateError, invalidApiKeyId } = (await getAutoUpdateState?.()) ?? {};
    // An invalidated key stays invalidated, so a key known to be is never checked again.
    if (invalidApiKeyId === key.id || (checkKey && (await apiKeys.isInvalidated(key)))) {
      return {
        status: {
          ...status,
          apiKeyInvalid: true,
          reason: status.needsUpdate ? invalidKeyReason(key) : status.reason,
        },
        keyId: key.id,
      };
    }
    if (status.needsUpdate && autoUpdateError) {
      // The error itself can name users and indices, so it stays in the server logs.
      return { status: { ...status, reason: AUTO_UPDATE_FAILED_REASON }, keyId: key.id };
    }
    return { status: { ...status, autoUpdate: true }, keyId: key.id };
  } catch (error) {
    // The transforms are fine either way; only automatic updates are in doubt.
    logger.warn(`Could not check the sessions API key: ${describeError(error)}`);
    return { status, keyId: null };
  }
};

/**
 * Adds what the stored API key means for `status`: whether a needed update applies by itself. A
 * deleted key doesn't stop the transforms, which keep the identity they were last updated with;
 * it only stops Kibana from updating them without a user. `checkKey` asks Elasticsearch whether
 * the key still works, which logs an authentication error in Kibana when it doesn't, so only
 * callers that act on the answer ask; the others rely on what the health task found. Never
 * throws: if the key can't be read, updates just don't apply automatically.
 */
export const withApiKeyStatus = async (
  ...args: Parameters<typeof getApiKeyStatus>
): Promise<SessionsStatus> => (await getApiKeyStatus(...args)).status;

/**
 * Applies a needed update with the stored key the transforms already run with, so they keep the
 * same access, and moves transforms left on another sessions key to it. Keeps who enabled
 * sessions, and when, as recorded at enable time. Returns false, without changes, when there is
 * nothing to do or the transforms don't run with a usable stored key.
 */
export const updateSessionsWithApiKey = async ({
  status,
  apiKeys,
  logger,
  audit,
  settings,
  now = new Date(),
}: {
  status: SessionsStatus;
  apiKeys: SessionsApiKeys;
  logger: Logger;
  audit: AuditLogger;
  settings: SessionsSettings;
  now?: Date;
}): Promise<boolean> => {
  const inUse = await keyInUse(status, apiKeys);
  if (!inUse || (!status.needsUpdate && inUse.strayKeys.length === 0)) {
    return false;
  }
  const { key, strayKeys } = inUse;
  const keyRef = `API key [${key.name}] (${key.id}) granted by user [${key.grantedBy}]`;
  const auditEvent = (outcome: 'success' | 'failure', error?: Error) =>
    audit.log({
      message:
        outcome === 'success'
          ? `Updated Digital Experience sessions with ${keyRef}`
          : `Failed to update Digital Experience sessions with ${keyRef}`,
      event: {
        action: 'digital_experience_sessions_auto_update',
        category: ['configuration'],
        type: ['change'],
        outcome,
      },
      ...(error ? { error: { code: error.name, message: error.message } } : {}),
    });

  try {
    await installSessions({
      esClient: await apiKeys.clusterClientFor(key),
      logger,
      settings,
      enabled: {
        enabledBy: status.enabledBy,
        enabledAt: status.enabledAt ?? now.toISOString(),
      },
    });
  } catch (error) {
    auditEvent('failure', error);
    throw error;
  }
  auditEvent('success');
  // Already invalidated by the enable that granted them, unless that failed.
  await apiKeys.invalidate(...strayKeys);
  return true;
};
