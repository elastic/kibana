/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  RUM_CCS_CLUSTER_NAME,
  RUM_CCS_CLUSTER_NAME_MAX,
  RUM_CCS_CLUSTERS_MAX,
} from '../../common/rum_ccs';
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
  SESSION_MAX_MS_DEFAULT,
  SESSION_MAX_MS_MIN,
  SESSION_MAX_MS_MAX,
  SESSION_IDLE_MS_DEFAULT,
  SESSION_IDLE_MS_MIN,
  SESSION_IDLE_MS_MAX,
} from '../../common/session_replay_settings';
import {
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_LOOKBACK_DAYS_MAX,
  RUM_SESSIONS_LOOKBACK_DAYS_MIN,
  RUM_SESSIONS_SYNC_DELAY,
} from '../../common/rum_sessions';

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

const attributesSchemaV4 = attributesSchemaV3.extends({
  sourceLookbackDays: schema.number({
    defaultValue: RUM_SESSIONS_LOOKBACK_DAYS,
    min: RUM_SESSIONS_LOOKBACK_DAYS_MIN,
    max: RUM_SESSIONS_LOOKBACK_DAYS_MAX,
  }),
});

const attributesSchemaV5 = attributesSchemaV4.extends({
  useAllRemoteClusters: schema.boolean({ defaultValue: false }),
  selectedRemoteClusters: schema.arrayOf(
    schema.string({
      maxLength: RUM_CCS_CLUSTER_NAME_MAX,
      validate: (value: string) => {
        if (!RUM_CCS_CLUSTER_NAME.test(value)) {
          return 'must be a remote cluster alias';
        }
      },
    }),
    { maxSize: RUM_CCS_CLUSTERS_MAX, defaultValue: [] }
  ),
});

const attributesSchemaV6 = attributesSchemaV5.extends({
  maskAllInputs: schema.boolean({ defaultValue: true }),
  maskAllText: schema.boolean({ defaultValue: true }),
  recordCanvas: schema.boolean({ defaultValue: true }),
  sessionMaxMs: schema.number({
    defaultValue: SESSION_MAX_MS_DEFAULT,
    min: SESSION_MAX_MS_MIN,
    max: SESSION_MAX_MS_MAX,
  }),
  sessionIdleMs: schema.number({
    defaultValue: SESSION_IDLE_MS_DEFAULT,
    min: SESSION_IDLE_MS_MIN,
    max: SESSION_IDLE_MS_MAX,
  }),
});

const attributesSchemaV7 = attributesSchemaV6.extends({
  maskAllText: schema.boolean({ defaultValue: false }),
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
    4: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => ({
            attributes: {
              sourceLookbackDays:
                typeof doc.attributes.sourceLookbackDays === 'number' &&
                doc.attributes.sourceLookbackDays >= RUM_SESSIONS_LOOKBACK_DAYS_MIN &&
                doc.attributes.sourceLookbackDays <= RUM_SESSIONS_LOOKBACK_DAYS_MAX
                  ? doc.attributes.sourceLookbackDays
                  : RUM_SESSIONS_LOOKBACK_DAYS,
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV4.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV4,
      },
    },
    5: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => ({
            attributes: {
              useAllRemoteClusters: Boolean(doc.attributes.useAllRemoteClusters),
              selectedRemoteClusters: Array.isArray(doc.attributes.selectedRemoteClusters)
                ? doc.attributes.selectedRemoteClusters
                    .filter(
                      (name: unknown): name is string =>
                        typeof name === 'string' && RUM_CCS_CLUSTER_NAME.test(name)
                    )
                    .slice(0, RUM_CCS_CLUSTERS_MAX)
                : [],
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV5.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV5,
      },
    },
    6: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => ({
            attributes: {
              maskAllInputs: doc.attributes.maskAllInputs !== false,
              maskAllText: doc.attributes.maskAllText !== false,
              recordCanvas: doc.attributes.recordCanvas !== false,
              sessionMaxMs:
                typeof doc.attributes.sessionMaxMs === 'number' &&
                doc.attributes.sessionMaxMs >= SESSION_MAX_MS_MIN &&
                doc.attributes.sessionMaxMs <= SESSION_MAX_MS_MAX
                  ? doc.attributes.sessionMaxMs
                  : SESSION_MAX_MS_DEFAULT,
              sessionIdleMs:
                typeof doc.attributes.sessionIdleMs === 'number' &&
                doc.attributes.sessionIdleMs >= SESSION_IDLE_MS_MIN &&
                doc.attributes.sessionIdleMs <= SESSION_IDLE_MS_MAX
                  ? doc.attributes.sessionIdleMs
                  : SESSION_IDLE_MS_DEFAULT,
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV6.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV6,
      },
    },
    7: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: () => ({
            attributes: {
              maskAllText: false,
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchemaV7.extends({}, { unknowns: 'ignore' }),
        create: attributesSchemaV7,
      },
    },
  },
};
