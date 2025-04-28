/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { ELASTICSEARCH_ELSER_INFERENCE_ID } from './ai_assistant_data_clients/knowledge_base/field_maps_configuration';

export interface ConfigSchema {
  elserInferenceId: string;
  responseTimeout: number;
}
export const configSchema = schema.object({
  elserInferenceId: schema.string({ defaultValue: ELASTICSEARCH_ELSER_INFERENCE_ID }),
});
