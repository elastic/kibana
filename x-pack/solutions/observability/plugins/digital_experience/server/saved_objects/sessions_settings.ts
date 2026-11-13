/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  SESSIONS_FREQUENCY_MAX_LENGTH,
  SESSIONS_MAX_CONCURRENCY,
  validateSessionsConcurrency,
  validateSessionsFrequency,
} from '../../common/sessions';

export const SESSIONS_SETTINGS_SO_TYPE = 'digital-experience-sessions-settings';
/** The only object of the type: the summaries task serves every space. */
export const SESSIONS_SETTINGS_SO_ID = 'digital-experience-sessions-settings';

/** The summaries task settings saved in the app. kibana.yml's apply to each one left out. */
export interface SessionsSettingsAttributes {
  frequency?: string;
  concurrency?: number;
}

const sessionsSettingsAttributesV1 = schema.object({
  frequency: schema.maybe(
    schema.string({ maxLength: SESSIONS_FREQUENCY_MAX_LENGTH, validate: validateSessionsFrequency })
  ),
  concurrency: schema.maybe(
    schema.number({ min: 1, max: SESSIONS_MAX_CONCURRENCY, validate: validateSessionsConcurrency })
  ),
});

/** Hidden, as only the Configure session summaries privilege may read or change the settings. */
export const sessionsSettingsSavedObjectType: SavedObjectsType = {
  name: SESSIONS_SETTINGS_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  // Read by id only.
  mappings: { dynamic: false, properties: {} },
  management: { importableAndExportable: false },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: sessionsSettingsAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: sessionsSettingsAttributesV1,
      },
    },
  },
};
