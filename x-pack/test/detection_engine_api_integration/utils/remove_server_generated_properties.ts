/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullResponseSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { pickBy } from 'lodash';

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: FullResponseSchema
): Omit<FullResponseSchema, 'id' | 'created_at' | 'updated_at'> => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    id,
    created_at,
    updated_at,
    execution_summary,
    ...removedProperties
  } = rule;
  // We're only removing undefined values, so this cast correctly narrows the type
  return pickBy(removedProperties, (value) => value !== undefined) as Omit<
    FullResponseSchema,
    'id' | 'created_at' | 'updated_at'
  >;
};
