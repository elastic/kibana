/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  OTLP_ENDPOINT_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SESSION_REPLAY_SETTINGS_SO_TYPE,
} from '../../common/session_replay_settings';

const attributesSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  otlpEndpoint: schema.string({ defaultValue: '', maxLength: OTLP_ENDPOINT_MAX_LENGTH }),
  serviceName: schema.string({ defaultValue: 'kibana', maxLength: SERVICE_NAME_MAX_LENGTH }),
  sampleRate: schema.number({ defaultValue: 100, min: 0, max: 100 }),
});

export const sessionReplaySettingsSavedObjectType: SavedObjectsType = {
  name: SESSION_REPLAY_SETTINGS_SO_TYPE,
  hidden: false,
  // Managed exclusively through the ux plugin's own settings routes.
  hiddenFromHttpApis: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      enabled: { type: 'boolean' },
      otlpEndpoint: { type: 'keyword', ignore_above: OTLP_ENDPOINT_MAX_LENGTH },
      serviceName: { type: 'keyword', ignore_above: SERVICE_NAME_MAX_LENGTH },
      sampleRate: { type: 'integer' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema,
      },
    },
  },
};
