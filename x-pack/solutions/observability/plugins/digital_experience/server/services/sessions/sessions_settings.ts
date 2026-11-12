/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsErrorHelpers,
  type CoreSetup,
  type ISavedObjectsRepository,
  type Logger,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SessionsSettings } from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import {
  SESSIONS_SETTINGS_SO_ID,
  SESSIONS_SETTINGS_SO_TYPE,
  type SessionsSettingsAttributes,
} from '../../saved_objects';

type SettingsReader = Pick<SavedObjectsClientContract, 'get'>;
type SettingsWriter = Pick<SavedObjectsClientContract, 'create'>;

/** The settings saved in the app, none when nothing was saved. */
export const getSavedSessionsSettings = async (
  client: SettingsReader
): Promise<SessionsSettingsAttributes> => {
  try {
    const { attributes } = await client.get<SessionsSettingsAttributes>(
      SESSIONS_SETTINGS_SO_TYPE,
      SESSIONS_SETTINGS_SO_ID
    );
    return attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return {};
    }
    throw error;
  }
};

/** The settings the summaries task runs with: the saved ones over kibana.yml's. */
export const toEffectiveSessionsSettings = (
  defaults: SessionsSettings,
  { frequency, concurrency }: SessionsSettingsAttributes
): SessionsSettings => ({
  frequency: frequency ?? defaults.frequency,
  concurrency: concurrency ?? defaults.concurrency,
});

/**
 * The settings the summaries task runs with. When the saved ones can't be read it runs with
 * kibana.yml's, as the settings never fail a run or a status.
 */
export const getEffectiveSessionsSettings = async ({
  client,
  defaults,
  logger,
}: {
  client: SettingsReader;
  defaults: SessionsSettings;
  logger: Logger;
}): Promise<SessionsSettings> => {
  try {
    return toEffectiveSessionsSettings(defaults, await getSavedSessionsSettings(client));
  } catch (error) {
    logger.warn(
      `Could not read the Digital Experience session summaries settings, using kibana.yml's: ${describeError(
        error
      )}`
    );
    return defaults;
  }
};

/** Saves the settings over the saved ones: kibana.yml's apply to each one left out. */
export const saveSessionsSettings = async (
  client: SettingsWriter,
  { frequency, concurrency }: SessionsSettingsAttributes
): Promise<SessionsSettingsAttributes> => {
  const { attributes } = await client.create<SessionsSettingsAttributes>(
    SESSIONS_SETTINGS_SO_TYPE,
    {
      ...(frequency === undefined ? {} : { frequency }),
      ...(concurrency === undefined ? {} : { concurrency }),
    },
    { id: SESSIONS_SETTINGS_SO_ID, overwrite: true }
  );
  return attributes;
};

/**
 * Reads the effective settings as the internal user, for the summaries task and the sessions
 * status, which users without the Configure session summaries privilege also read.
 */
export const createSessionsSettingsGetter = ({
  core,
  defaults,
  logger,
}: {
  core: CoreSetup;
  defaults: SessionsSettings;
  logger: Logger;
}): (() => Promise<SessionsSettings>) => {
  let repository: ISavedObjectsRepository | undefined;
  return async () => {
    if (!repository) {
      const [coreStart] = await core.getStartServices();
      repository = coreStart.savedObjects.createInternalRepository([SESSIONS_SETTINGS_SO_TYPE]);
    }
    return getEffectiveSessionsSettings({ client: repository, defaults, logger });
  };
};
