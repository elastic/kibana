/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/** Schema that validates the file info API */
export const EndpointActionFileInfoSchema = {
  params: schema.object({
    action_id: schema.string({ minLength: 1 }),
    file_id: schema.string({ minLength: 1 }),
  }),
};

export type EndpointActionFileInfoParams = TypeOf<typeof EndpointActionFileInfoSchema.params>;
