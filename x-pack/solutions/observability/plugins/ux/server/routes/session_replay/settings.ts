/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_CCS_CLUSTER_NAME_MAX, RUM_CCS_CLUSTERS_MAX } from '../../../common/rum_ccs';
import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  SESSION_REPLAY_SETTINGS_SO_ID,
  SESSION_REPLAY_SETTINGS_SO_TYPE,
  normalizeSessionReplaySettings,
  OTLP_ENDPOINT_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  IGNORE_URLS_MAX_LENGTH,
  URL_GROUPING_RULES_MAX_LENGTH,
  MASK_TEXT_SELECTOR_MAX_LENGTH,
  SYNC_DELAY_MAX_LENGTH,
  type SessionReplaySettings,
} from '../../../common/session_replay_settings';
import { applyRumAnalyticsSettings, extractEsErrorMessage } from '../../transforms/rum_sessions';

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { output?: { statusCode?: number } }).output?.statusCode === 404;

export const readSessionReplaySettings = async (
  repo: ISavedObjectsRepository
): Promise<SessionReplaySettings> => {
  try {
    const so = await repo.get<Partial<SessionReplaySettings>>(
      SESSION_REPLAY_SETTINGS_SO_TYPE,
      SESSION_REPLAY_SETTINGS_SO_ID
    );
    return normalizeSessionReplaySettings({ ...DEFAULT_SESSION_REPLAY_SETTINGS, ...so.attributes });
  } catch (error) {
    if (isNotFound(error)) {
      return { ...DEFAULT_SESSION_REPLAY_SETTINGS };
    }
    throw error;
  }
};

// Read on every Kibana page load to bootstrap the client SDK; the settings are
// not sensitive and are read via an internal repository, so no per-user authz.
export const getSessionReplaySettingsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/settings',
  options: { access: 'internal' },
  security: {
    authz: {
      enabled: false,
      reason:
        'Session replay bootstrap settings are read on every page load and contain no sensitive data.',
    },
  },
  handler: async ({ core }): Promise<SessionReplaySettings> => {
    const coreStart = await core.start();
    const repo = coreStart.savedObjects.createInternalRepository();
    return readSessionReplaySettings(repo);
  },
});

// Bound untrusted string input to guard against unbounded-input DoS.
const boundedString = (max: number) =>
  new t.Type<string, string, unknown>(
    `BoundedString(${max})`,
    (u): u is string => typeof u === 'string',
    (u, c) => (typeof u === 'string' && u.length <= max ? t.success(u) : t.failure(u, c)),
    t.identity
  );

const boundedStringList = (maxItem: number, maxItems: number) =>
  new t.Type<string[], string[], unknown>(
    `BoundedStringList(${maxItem},${maxItems})`,
    (u): u is string[] => Array.isArray(u) && u.every((item) => typeof item === 'string'),
    (u, c) => {
      if (!Array.isArray(u) || u.length > maxItems) {
        return t.failure(u, c);
      }
      if (u.some((item) => typeof item !== 'string' || item.length > maxItem)) {
        return t.failure(u, c);
      }
      return t.success(u);
    },
    t.identity
  );

const settingsBody = t.intersection([
  t.type({
    enabled: t.boolean,
    otlpEndpoint: boundedString(OTLP_ENDPOINT_MAX_LENGTH),
    serviceName: boundedString(SERVICE_NAME_MAX_LENGTH),
    sampleRate: t.number,
  }),
  t.partial({
    ignoreUrls: boundedString(IGNORE_URLS_MAX_LENGTH),
    urlGroupingDepth: t.number,
    urlGroupingRules: boundedString(URL_GROUPING_RULES_MAX_LENGTH),
    maskTextSelector: boundedString(MASK_TEXT_SELECTOR_MAX_LENGTH),
    maskAllInputs: t.boolean,
    maskAllText: t.boolean,
    recordCanvas: t.boolean,
    sessionMaxMs: t.number,
    sessionIdleMs: t.number,
    captureGraphql: t.boolean,
    syncDelay: boundedString(SYNC_DELAY_MAX_LENGTH),
    sourceLookbackDays: t.number,
    useAllRemoteClusters: t.boolean,
    selectedRemoteClusters: boundedStringList(RUM_CCS_CLUSTER_NAME_MAX, RUM_CCS_CLUSTERS_MAX),
  }),
]);

export const updateSessionReplaySettingsRoute = createUxServerRoute({
  endpoint: 'PUT /internal/ux/session_replay/settings',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: settingsBody }),
  handler: async ({ context, core, logger, params }): Promise<SessionReplaySettings> => {
    const coreStart = await core.start();
    const repo = coreStart.savedObjects.createInternalRepository();
    const attributes = normalizeSessionReplaySettings(params.body);
    const so = await repo.create<SessionReplaySettings>(
      SESSION_REPLAY_SETTINGS_SO_TYPE,
      attributes,
      {
        id: SESSION_REPLAY_SETTINGS_SO_ID,
        overwrite: true,
      }
    );
    const saved = normalizeSessionReplaySettings({
      ...DEFAULT_SESSION_REPLAY_SETTINGS,
      ...so.attributes,
    });
    try {
      const { elasticsearch } = await context.core;
      await applyRumAnalyticsSettings({
        client: elasticsearch.client.asCurrentUser,
        logger,
        syncDelay: saved.syncDelay,
        sourceLookbackDays: saved.sourceLookbackDays,
      });
    } catch (error) {
      logger.warn(
        `Saved session replay settings but could not update transforms: ${extractEsErrorMessage(
          error
        )}`
      );
    }
    return saved;
  },
});
