/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const LogExtractionOverridesTypeName = 'entity-store-log-extraction-overrides';

const LogExtractionOverridesTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {},
};

const duration = schema.string();

const overridesSchemaV1 = schema.object({
  additionalIndexPatterns: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10000 })),
  excludedIndexPatterns: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10000 })),
  fieldHistoryLength: schema.maybe(schema.number()),
  lookbackPeriod: schema.maybe(duration),
  delay: schema.maybe(duration),
  docsLimit: schema.maybe(schema.number()),
  maxLogsPerPage: schema.maybe(schema.number()),
  timeout: schema.maybe(duration),
  frequency: schema.maybe(duration),
  maxTimeWindowSize: schema.maybe(duration),
  maxLogsPerWindow: schema.maybe(schema.number()),
  maxLogsPerWindowCapBehavior: schema.maybe(
    schema.oneOf([schema.literal('defer'), schema.literal('drop')] as const)
  ),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: overridesSchemaV1,
    forwardCompatibility: overridesSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

export const LogExtractionOverridesType: SavedObjectsType = {
  name: LogExtractionOverridesTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: LogExtractionOverridesTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
