/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { NightshiftAutomationBudgetAttributes } from '../lib/automations/types';

export const NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE = 'nightshift-automation-budget';

const attributesSchema = schema.object({
  automationId: schema.string({ maxLength: 512 }),
  date: schema.string({ maxLength: 10 }),
  used: schema.number({
    min: 0,
    validate: (value) => (Number.isSafeInteger(value) ? undefined : 'Expected an integer'),
  }),
});

export const nightshiftAutomationBudgetSavedObjectType: SavedObjectsType<NightshiftAutomationBudgetAttributes> =
  {
    name: NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    // One document per automation, accessed by ID; its counter resets on the next UTC day.
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
