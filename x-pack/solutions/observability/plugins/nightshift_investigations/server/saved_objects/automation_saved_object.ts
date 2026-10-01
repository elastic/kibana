/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { NightshiftAutomationAttributes } from '../lib/automations/types';

export const NIGHTSHIFT_AUTOMATION_SO_TYPE = 'nightshift-automation';

const opaqueObject = schema.object({}, { unknowns: 'allow' });

const automationAttributesSchemaV1 = schema.object({
  name: schema.string({ maxLength: 500 }),
  description: schema.maybe(schema.string({ maxLength: 5000 })),
  automationType: schema.string({ maxLength: 50 }),
  isEnabled: schema.boolean(),
  workflowId: schema.maybe(schema.string({ maxLength: 500 })),
  trigger: opaqueObject,
  execution: opaqueObject,
  completion: opaqueObject,
  runtime: opaqueObject,
  createdAt: schema.string({ maxLength: 64 }),
  updatedAt: schema.string({ maxLength: 64 }),
});

export const nightshiftAutomationSavedObjectType: SavedObjectsType<NightshiftAutomationAttributes> =
  {
    name: NIGHTSHIFT_AUTOMATION_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        name: { type: 'keyword', ignore_above: 500 },
        automationType: { type: 'keyword', ignore_above: 50 },
        isEnabled: { type: 'boolean' },
        workflowId: { type: 'keyword', ignore_above: 500 },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: automationAttributesSchemaV1,
          forwardCompatibility: automationAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
