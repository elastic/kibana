/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export type PostGenerateRequestBody = z.infer<typeof PostGenerateRequestBody>;
export declare const PostGenerateRequestBody: z.ZodObject<
  {
    alerts_index_pattern: z.ZodString;
    api_config: z.ZodObject<
      {
        connector_id: z.ZodString;
        action_type_id: z.ZodString;
        default_system_prompt_id: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<
          z.ZodEnum<{
            OpenAI: 'OpenAI';
            'Azure OpenAI': 'Azure OpenAI';
            Other: 'Other';
          }>
        >;
        model: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >;
    end: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    size: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    start: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<{
      attack_discovery: 'attack_discovery';
      defend_insights: 'defend_insights';
    }>;
    workflow_config: z.ZodOptional<
      z.ZodObject<
        {
          alert_retrieval_workflow_ids: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
          default_alert_retrieval_mode: z.ZodDefault<
            z.ZodOptional<
              z.ZodEnum<{
                disabled: 'disabled';
                esql: 'esql';
                custom_query: 'custom_query';
              }>
            >
          >;
          esql_query: z.ZodOptional<z.ZodString>;
          validation_workflow_id: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type PostGenerateRequestBodyInput = z.input<typeof PostGenerateRequestBody>;
export type PostGenerateResponse = z.infer<typeof PostGenerateResponse>;
export declare const PostGenerateResponse: z.ZodObject<
  {
    execution_uuid: z.ZodString;
  },
  z.core.$strip
>;
