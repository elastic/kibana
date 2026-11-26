/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { validateInteger } from '../../common/validate_integer';

export const SO_SLO_GLOBAL_SETTINGS_TYPE = 'slo-global-settings';
export const SLO_GLOBAL_SETTINGS_ID = 'slo-global-settings-singleton';

const sloGlobalSettingsAttributesSchema = {
  sliRetention: schema.maybe(
    schema.object({
      enabled: schema.boolean(),
      periodDays: schema.number({
        min: 1,
        validate: validateInteger,
      }),
      updatedAt: schema.string({ maxLength: 64 }),
    })
  ),
};

export const sloGlobalSettings: SavedObjectsType = {
  name: SO_SLO_GLOBAL_SETTINGS_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: schema.object(sloGlobalSettingsAttributesSchema),
        update: schema.object(sloGlobalSettingsAttributesSchema),
        forwardCompatibility: schema.object(sloGlobalSettingsAttributesSchema, {
          unknowns: 'ignore',
        }),
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    displayName: 'Global SLO settings',
    importableAndExportable: false,
  },
};
