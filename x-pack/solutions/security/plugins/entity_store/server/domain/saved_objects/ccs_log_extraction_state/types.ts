/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const CcsLogExtractionStateTypeName = 'entity-store-ccs-state';

const stateSchemaV1 = schema.object({
  checkpointTimestamp: schema.nullable(schema.string()),
  paginationRecoveryId: schema.nullable(schema.string()),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: stateSchemaV1,
    forwardCompatibility: stateSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

export const CcsLogExtractionStateType: SavedObjectsType = {
  name: CcsLogExtractionStateTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  // Fields are not queried, only read — no mappings needed
  mappings: { dynamic: false, properties: {} },
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
