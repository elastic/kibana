/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

export const NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE =
  'nightshift-sandbox-connector-settings';

export const NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID = 'sandbox-connector-settings';

export const MAX_DISABLED_SANDBOX_CONNECTORS = 500;
export const MAX_CONNECTOR_ID_LENGTH = 256;

export interface NightshiftSandboxConnectorSettingsAttributes {
  disabled_connector_ids: string[];
}

const attributesSchemaV1 = schema.object({
  disabled_connector_ids: schema.arrayOf(schema.string({ maxLength: MAX_CONNECTOR_ID_LENGTH }), {
    maxSize: MAX_DISABLED_SANDBOX_CONNECTORS,
  }),
});

export const nightshiftSandboxConnectorSettingsSavedObjectType: SavedObjectsType<NightshiftSandboxConnectorSettingsAttributes> =
  {
    name: NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
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
          create: attributesSchemaV1,
          forwardCompatibility: attributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
