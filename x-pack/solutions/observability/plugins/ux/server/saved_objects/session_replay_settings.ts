/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  IGNORE_URLS_MAX_LENGTH,
  MASK_TEXT_SELECTOR_MAX_LENGTH,
  OTLP_ENDPOINT_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SESSION_REPLAY_SETTINGS_SO_TYPE,
  URL_GROUPING_DEPTH_MAX,
  URL_GROUPING_DEPTH_MIN,
  URL_GROUPING_RULES_MAX_LENGTH,
  SYNC_DELAY_MAX_LENGTH,
} from '../../common/session_replay_settings';
import { RUM_SESSIONS_SYNC_DELAY } from '../../common/rum_sessions';

const attributesSchemaV1 = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  otlpEndpoint: schema.string({ defaultValue: '', maxLength: OTLP_ENDPOINT_MAX_LENGTH }),
  serviceName: schema.string({ defaultValue: 'kibana', maxLength: SERVICE_NAME_MAX_LENGTH }),
  sampleRate: schema.number({ defaultValue: 100, min: 0, max: 100 }),
});

const attributesSchemaV2 = attributesSchemaV1.extends({
  ignoreUrls: schema.string({ defaultValue: '', maxLength: IGNORE_URLS_MAX_LENGTH }),
  urlGroupingDepth: schema.number({
    defaultValue: 3,
    min: URL_GROUPING_DEPTH_MIN,
    max: URL_GROUPING_DEPTH_MAX,
  }),
  urlGroupingRules: schema.string({ defaultValue: '', maxLength: URL_GROUPING_RULES_MAX_LENGTH }),
  maskTextSelector: schema.string({ defaultValue: '', maxLength: MASK_TEXT_SELECTOR_MAX_LENGTH }),
  captureGraphql: schema.boolean({ defaultValue: false }),
});

const attributesSchemaV3 = attributesSchemaV2.extends({
  syncDelay: schema.string({
    defaultValue: RUM_SESSIONS_SYNC_DELAY,
    minLength: 2,
    maxLength: SYNC_DELAY_MAX_LENGTH,
    validate: (value: string) => {
      if (!/^[1-9]\d*[smh]$/.test(value)) {
        return 'must be a positive Elasticsearch time value such as 5m, 30s, or 1h';
      }
    },
  }),
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
      ignoreUrls: { type: 'text' },
      urlGroupingDepth: { type: 'integer' },
      urlGroupingRules: { type: 'text' },
      maskTextSelector: { type: 'keyword', ignore_above: MASK_TEXT_SELECTOR_MAX_LENGTH },
      captureGraphql: { type: 'boolean' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            ignoreUrls: { type: 'text' },
            urlGroupingDepth: { type: 'integer' },
            urlGroupingRules: { type: 'text' },
            maskTextSelector: { type: 'keyword', ignore_above: MASK_TEXT_SELECTOR_MAX_LENGTH },
            captureGraphql: { type: 'boolean' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV2,
      },
    },
    3: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => ({
            attributes: {
              syncDelay:
                typeof doc.attributes.syncDelay === 'string' && doc.attributes.syncDelay
                  ? doc.attributes.syncDelay
                  : RUM_SESSIONS_SYNC_DELAY,
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV3.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV3,
      },
    },
  },
};
