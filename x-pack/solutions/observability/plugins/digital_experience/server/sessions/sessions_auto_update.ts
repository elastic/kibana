/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SessionsSettings, SessionsStatus } from '../../common/sessions';
import type { SessionsApiKey, SessionsApiKeys } from './sessions_api_key';
import { checkSessionsPrivileges, installSessions } from './sessions_setup';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A new key for the transforms, or null to fall back to the user's own credentials. */
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
      logger.warn('API keys are disabled, so sessions will need a manual update after upgrades.');
    }
    return key;
  } catch (error) {
    logger.warn(
      `Could not grant an API key for the sessions transforms, so they will need a manual update after upgrades: ${messageOf(
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
  now = new Date(),
}: {
  /** Scoped to the user behind `request`. */
  esClient: IScopedClusterClient;
  apiKeys: SessionsApiKeys;
  request: KibanaRequest;
  logger: Logger;
  settings: SessionsSettings;
  enabledBy: string | null;
  now?: Date;
}): Promise<SessionsApiKey | null> => {
  // As the user: the key's own privileges can't answer the document- and field-level check.
  await checkSessionsPrivileges(esClient.asCurrentUser);

  const previous = await apiKeys.get();
  const key = await grantKey({ apiKeys, request, enabledBy, now, logger });
  const enabled = { enabledBy, enabledAt: now.toISOString() };

  if (!key) {
    await installSessions({ esClient, logger, settings, enabled });
    if (previous) {
      // The transforms no longer run with it, so the health task mustn't put it back.
      await apiKeys.delete();
      await apiKeys.invalidate(previous);
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
    await apiKeys.save(key);
  } catch (error) {
    // The transforms already run with the new key, so enabling succeeded; only automatic updates
    // are lost. The previous key must not come back, so it goes too.
    logger.error(
      `Could not store the sessions API key, so sessions will need a manual update after upgrades: ${messageOf(
        error
      )}`
    );
    if (previous) {
      await apiKeys.delete();
    }
  }
  if (previous && previous.id !== key.id) {
    await apiKeys.invalidate(previous);
  }
  return key;
};

/** The stored key the installed transforms run with, or null if they run with other credentials. */
const keyInUse = async (
  status: SessionsStatus,
  apiKeys: SessionsApiKeys
): Promise<SessionsApiKey | null> => {
  if (!status.installed || !apiKeys.available) {
    return null;
  }
  const key = await apiKeys.get();
  return key && status.authorization?.apiKeyId === key.id ? key : null;
};

const AUTO_UPDATE_FAILED_REASON =
  'The last automatic update of the sessions transforms failed (see the Kibana server logs); enable sessions again to apply it.';

const invalidKeyReason = (key: SessionsApiKey) =>
  `The API key [${key.name}] that Kibana updates the sessions transforms with was invalidated or has expired, so this update can't apply automatically; enable sessions again to apply it and grant a new key.`;

/**
 * Adds what the stored API key means for `status`: whether a needed update applies by itself. A
 * deleted key doesn't stop the transforms, which keep the identity they were last updated with;
 * it only stops Kibana from updating them without a user. `checkKey` asks Elasticsearch whether
 * the key still works, which logs an authentication error in Kibana when it doesn't, so only
 * callers that act on the answer ask.
 */
export const withApiKeyStatus = async (
  status: SessionsStatus,
  apiKeys: SessionsApiKeys,
  {
    checkKey,
    lastAutoUpdateError,
  }: {
    checkKey: boolean;
    /** The health task's last failed automatic update, so a failing one doesn't look pending. */
    lastAutoUpdateError?: string;
  }
): Promise<SessionsStatus> => {
  const key = await keyInUse(status, apiKeys);
  if (!key) {
    return status;
  }
  if (checkKey && (await apiKeys.isInvalidated(key))) {
    return {
      ...status,
      apiKeyInvalid: true,
      reason: status.needsUpdate ? invalidKeyReason(key) : status.reason,
    };
  }
  if (status.needsUpdate && lastAutoUpdateError) {
    // The error itself can name users and indices, so it stays in the server logs.
    return { ...status, reason: AUTO_UPDATE_FAILED_REASON };
  }
  return { ...status, autoUpdate: true };
};

/**
 * Applies a needed update with the stored key the transforms already run with, so they keep the
 * same access. Keeps who enabled sessions, and when, as recorded at enable time. Returns false,
 * without changes, when the transforms don't run with a usable stored key.
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
  const key = await keyInUse(status, apiKeys);
  if (!key || !status.needsUpdate) {
    return false;
  }
  const auditEvent = (outcome: 'success' | 'failure', error?: Error) =>
    audit.log({
      message:
        outcome === 'success'
          ? `Updated Digital Experience sessions with API key [${key.name}] granted by user [${key.grantedBy}]`
          : `Failed to update Digital Experience sessions with API key [${key.name}] granted by user [${key.grantedBy}]`,
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
  return true;
};
