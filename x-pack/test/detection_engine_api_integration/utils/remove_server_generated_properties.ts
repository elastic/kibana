/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullResponseSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/request';

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: FullResponseSchema
): Partial<FullResponseSchema> => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    id,
    created_at,
    updated_at,
    execution_summary,
    /* eslint-enable @typescript-eslint/naming-convention */
    ...removedProperties
  } = rule;
  return removedProperties;
};
