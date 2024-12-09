/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

/** Schema that validates the file download API */
export const EndpointActionFileDownloadSchema = {
  params: schema.object({
    action_id: schema.string({ minLength: 1 }),
    file_id: schema.string({ minLength: 1 }),
  }),
};

export type EndpointActionFileDownloadParams = TypeOf<
  typeof EndpointActionFileDownloadSchema.params
>;
