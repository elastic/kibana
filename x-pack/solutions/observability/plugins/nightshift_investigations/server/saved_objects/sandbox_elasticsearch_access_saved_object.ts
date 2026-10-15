/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

export const NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE = 'nightshift-sandbox-es-access';

// One UIAM service account serves the whole project, so there is a single object under a fixed id.
export const NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID = 'sandbox-elasticsearch-access';

/** The UIAM service account the sandbox reaches this cluster as. Holds no credential. */
export interface NightshiftSandboxEsAccessAttributes {
  serviceAccountId: string;
  /** ISO-8601 timestamp of when Kibana created the account. */
  createdAt: string;
}

const nightshiftSandboxEsAccessAttributesSchemaV1 = schema.object({
  serviceAccountId: schema.string({ minLength: 1, maxLength: 1024 }),
  createdAt: schema.string({ maxLength: 64 }),
});

export const nightshiftSandboxEsAccessSavedObjectType: SavedObjectsType<NightshiftSandboxEsAccessAttributes> =
  {
    name: NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: nightshiftSandboxEsAccessAttributesSchemaV1,
          forwardCompatibility: nightshiftSandboxEsAccessAttributesSchemaV1.extends(
            {},
            { unknowns: 'ignore' }
          ),
        },
      },
    },
  };
