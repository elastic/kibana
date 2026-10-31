/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  CONVERSION_GOAL_CURRENCY_MAX,
  CONVERSION_GOAL_NAME_MAX,
  CONVERSION_GOAL_VALUE_MAX,
  RUM_CONVERSION_GOAL_SO_TYPE,
} from '../../common/conversion_goal';
import {
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_LABEL_MAX_LENGTH,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
} from '../../common/session_funnel';

const attributesSchema = schema.object({
  name: schema.string({ maxLength: CONVERSION_GOAL_NAME_MAX }),
  steps: schema.arrayOf(
    schema.object({
      type: schema.oneOf([schema.literal('page'), schema.literal('activity')]),
      value: schema.string({ maxLength: FUNNEL_STEP_VALUE_MAX_LENGTH }),
      label: schema.maybe(schema.string({ maxLength: FUNNEL_STEP_LABEL_MAX_LENGTH })),
    }),
    { minSize: FUNNEL_MIN_STEPS, maxSize: FUNNEL_MAX_STEPS }
  ),
  value: schema.number({ min: 0, max: CONVERSION_GOAL_VALUE_MAX }),
  currency: schema.string({ maxLength: CONVERSION_GOAL_CURRENCY_MAX, minLength: 3 }),
  createdAt: schema.string({ maxLength: 40 }),
  updatedAt: schema.string({ maxLength: 40 }),
});

export const conversionGoalSavedObjectType: SavedObjectsType = {
  name: RUM_CONVERSION_GOAL_SO_TYPE,
  hidden: false,
  hiddenFromHttpApis: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema,
      },
    },
  },
};
