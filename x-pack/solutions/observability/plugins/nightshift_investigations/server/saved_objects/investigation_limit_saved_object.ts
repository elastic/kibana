/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE = 'nightshift-investigation-limit';
export const NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID = 'global';
export const MAX_INVESTIGATION_LIMIT = 100000;

export interface NightshiftInvestigationLimitAttributes {
  limit?: number;
}

const attributesSchema = schema.object({
  limit: schema.maybe(
    schema.number({
      min: 1,
      max: MAX_INVESTIGATION_LIMIT,
      validate: (value) => (Number.isSafeInteger(value) ? undefined : 'Expected an integer'),
    })
  ),
});

export const nightshiftInvestigationLimitSavedObjectType: SavedObjectsType<NightshiftInvestigationLimitAttributes> =
  {
    name: NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: { dynamic: false, properties: {} },
    management: { importableAndExportable: false },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: attributesSchema,
          forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
