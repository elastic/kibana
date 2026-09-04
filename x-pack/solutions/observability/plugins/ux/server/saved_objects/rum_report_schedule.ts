/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { RUM_REPORT_SCHEDULE_SO_TYPE } from '../../common/rum_report_schedule';

const filtersSchema = schema.object({
  serviceName: schema.maybe(schema.string({ maxLength: 256 })),
  browser: schema.maybe(schema.string({ maxLength: 128 })),
  os: schema.maybe(schema.string({ maxLength: 128 })),
  location: schema.maybe(schema.string({ maxLength: 8 })),
  pageUrl: schema.maybe(schema.string({ maxLength: 512 })),
  frustration: schema.maybe(schema.string({ maxLength: 32 })),
  user: schema.maybe(schema.string({ maxLength: 256 })),
  includeBots: schema.maybe(schema.string({ maxLength: 8 })),
  kuery: schema.maybe(schema.string({ maxLength: 4096 })),
  breakpoint: schema.maybe(schema.string({ maxLength: 32 })),
  connection: schema.maybe(schema.string({ maxLength: 64 })),
  device: schema.maybe(schema.string({ maxLength: 64 })),
  errorGroup: schema.maybe(schema.string({ maxLength: 256 })),
  includePii: schema.maybe(schema.boolean()),
});

const cadenceSchema = schema.oneOf([
  schema.literal('daily'),
  schema.literal('weekdays'),
  schema.literal('weekly'),
  schema.literal('biweekly'),
  schema.literal('monthly'),
]);

const attributesSchemaV1 = schema.object({
  name: schema.string({ maxLength: 200 }),
  enabled: schema.boolean(),
  cadence: schema.oneOf([
    schema.literal('weekly'),
    schema.literal('biweekly'),
    schema.literal('monthly'),
  ]),
  connectorId: schema.string({ maxLength: 128 }),
  to: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 20 }),
  templateId: schema.oneOf([
    schema.literal('scorecard'),
    schema.literal('pages'),
    schema.literal('errors'),
    schema.literal('frustration'),
    schema.literal('funnel'),
    schema.literal('clients'),
    schema.literal('users'),
  ]),
  filters: filtersSchema,
  createdAt: schema.string({ maxLength: 40 }),
  lastRunAt: schema.maybe(schema.string({ maxLength: 40 })),
  lastError: schema.maybe(schema.string({ maxLength: 1000 })),
});

const attributesSchemaV2 = attributesSchemaV1.extends({
  cadence: cadenceSchema,
  weekday: schema.maybe(
    schema.oneOf([
      schema.literal('MO'),
      schema.literal('TU'),
      schema.literal('WE'),
      schema.literal('TH'),
      schema.literal('FR'),
      schema.literal('SA'),
      schema.literal('SU'),
    ])
  ),
  monthday: schema.maybe(schema.number({ min: 1, max: 28 })),
  hour: schema.maybe(schema.number({ min: 0, max: 23 })),
  minute: schema.maybe(schema.number({ min: 0, max: 59 })),
  tzid: schema.maybe(schema.string({ maxLength: 64 })),
});

const attributesSchema = attributesSchemaV2.extends({
  includeAi: schema.maybe(schema.boolean()),
  inferenceConnectorId: schema.maybe(schema.string({ maxLength: 128 })),
});

export const rumReportScheduleSavedObjectType: SavedObjectsType = {
  name: RUM_REPORT_SCHEDULE_SO_TYPE,
  hidden: false,
  hiddenFromHttpApis: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      enabled: { type: 'boolean' },
      cadence: { type: 'keyword', ignore_above: 32 },
      connectorId: { type: 'keyword', ignore_above: 128 },
      templateId: { type: 'keyword', ignore_above: 32 },
      createdAt: { type: 'date' },
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
      changes: [],
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
              includeAi: doc.attributes.includeAi ?? false,
            },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema,
      },
    },
  },
};
