/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import {
  SESSIONS_FREQUENCY_MAX_LENGTH,
  SESSIONS_MAX_CONCURRENCY,
  SESSIONS_TASK_ID,
  validateSessionsFrequency,
  type SessionsSettings,
  type SessionsSettingsResponse,
} from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { SESSIONS_SETTINGS_SO_TYPE, type SessionsSettingsAttributes } from '../../saved_objects';
import {
  getSavedSessionsSettings,
  saveSessionsSettings,
  toEffectiveSessionsSettings,
} from '../../services/sessions/sessions_settings';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';

export const SESSIONS_SETTINGS_ENDPOINT = 'GET /internal/digital_experience/sessions/settings';
export const SESSIONS_SETTINGS_UPDATE_ENDPOINT =
  'PUT /internal/digital_experience/sessions/settings';

const security = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.configureSessions] },
};

/**
 * Runs the task now, so it reads a changed frequency instead of waiting out the previous one. A
 * running task, or none when sessions aren't set up, reads it at its next run.
 */
const runSoon = async (taskManager: TaskManagerStartContract | undefined, logger: Logger) => {
  try {
    await taskManager?.runSoon(SESSIONS_TASK_ID);
  } catch (error) {
    logger.debug(`Could not run the sessions task right away: ${describeError(error)}`);
  }
};

/** Saves the settings, and returns the effective ones from before and after. */
const changeSettings = async (
  client: SavedObjectsClientContract,
  defaults: SessionsSettings,
  body: SessionsSettingsAttributes
): Promise<{ before: SessionsSettings; after: SessionsSettings }> => {
  const before = toEffectiveSessionsSettings(defaults, await getSavedSessionsSettings(client));
  const after = toEffectiveSessionsSettings(defaults, await saveSessionsSettings(client, body));
  return { before, after };
};

const getSettingsRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_SETTINGS_ENDPOINT,
  options: { access: 'internal' },
  security,
  handler: async ({ context, sessionsSettingsDefaults }): Promise<SessionsSettingsResponse> => {
    const { savedObjects } = await context.core;
    // As the user, so the saved object privileges of the route's privilege apply, and are audited.
    const client = savedObjects.getClient({ includedHiddenTypes: [SESSIONS_SETTINGS_SO_TYPE] });
    const saved = await getSavedSessionsSettings(client);
    return {
      settings: toEffectiveSessionsSettings(sessionsSettingsDefaults, saved),
      defaults: sessionsSettingsDefaults,
    };
  },
});

const updateSettingsRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_SETTINGS_UPDATE_ENDPOINT,
  options: { access: 'internal' },
  security,
  params: lazySchema(() =>
    z.object({
      // Each setting left out follows kibana.yml.
      body: z
        .object({
          frequency: z
            .string()
            .max(SESSIONS_FREQUENCY_MAX_LENGTH)
            .refine((value) => validateSessionsFrequency(value) === undefined, {
              message: 'must be a time value between 1s and 1h, such as 30s, 1m or 5m',
            })
            .optional(),
          concurrency: z.number().int().min(1).max(SESSIONS_MAX_CONCURRENCY).optional(),
        })
        // The route repository drops an empty body, so none saves none.
        .optional(),
    })
  ),
  handler: async ({
    context,
    params,
    sessionsSettingsDefaults: defaults,
    getSessionsServices,
    logger,
  }): Promise<SessionsSettingsResponse> => {
    const { savedObjects, security: coreSecurity } = await context.core;
    const client = savedObjects.getClient({ includedHiddenTypes: [SESSIONS_SETTINGS_SO_TYPE] });
    const username = coreSecurity.authc.getCurrentUser()?.username ?? null;
    const audit = (outcome: 'success' | 'failure', message: string, error?: Error) =>
      coreSecurity.audit.logger.log({
        message,
        event: {
          action: 'digital_experience_sessions_settings_update',
          category: ['configuration'],
          type: ['change'],
          outcome,
        },
        ...(error ? { error: { code: error.name, message: error.message } } : {}),
      });

    // With every param optional, the route repository types them as optional too.
    const body = params?.body ?? {};
    const { before, after: settings } = await changeSettings(client, defaults, body).catch(
      (error: Error) => {
        audit(
          'failure',
          `Failed attempt by user [${username}] to change the Digital Experience session summaries settings`,
          error
        );
        throw error;
      }
    );
    const { frequency, concurrency } = settings;
    audit(
      'success',
      `User [${username}] changed the Digital Experience session summaries settings to frequency [${frequency}] and concurrency [${concurrency}]`
    );
    logger.info(
      `Session summaries settings changed by [${username}]: frequency [${frequency}], concurrency [${concurrency}]`
    );
    if (frequency !== before.frequency) {
      const { taskManager } = await getSessionsServices();
      await runSoon(taskManager, logger);
    }
    return { settings, defaults };
  },
});

/** The session summaries settings routes, keyed by endpoint. */
export const sessionsSettingsRouteRepository = {
  ...getSettingsRoute,
  ...updateSettingsRoute,
};
