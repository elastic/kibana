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

const budgetAttributesSchemaV1 = schema.object({
  automationId: schema.string({ maxLength: 500 }),
  date: schema.string({ maxLength: 16 }),
  used: schema.number({ min: 0 }),
});

export const nightshiftAutomationBudgetSavedObjectType: SavedObjectsType<NightshiftAutomationBudgetAttributes> =
  {
    name: NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        automationId: { type: 'keyword', ignore_above: 500 },
        date: { type: 'keyword', ignore_above: 16 },
        used: { type: 'integer' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: budgetAttributesSchemaV1,
          forwardCompatibility: budgetAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
