/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../endpoint/types';
import { validateNonEmptyString } from '../schema_utils';

export const PatchUpdateRequestSchema = {
  body: schema.object({}),
  params: schema.object({
    script_id: schema.string({ validate: validateNonEmptyString }),
  }),
};

export type PatchUpdateRequestParams = DeepMutable<TypeOf<typeof PatchUpdateRequestSchema.params>>;
export type PatchUpdateRequestBody = DeepMutable<TypeOf<typeof PatchUpdateRequestSchema.body>>;
