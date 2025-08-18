/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

export interface ConfigSchema {
  elserInferenceId: string;
  responseTimeout: number;
}
export const configSchema = schema.object({
  elserInferenceId: schema.string({ defaultValue: defaultInferenceEndpoints.ELSER }),
  responseTimeout: schema.number({
    defaultValue: 10 * 60 * 1000, // 10 minutes
  }),
});
