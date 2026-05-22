/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/**
 * Input for the default alert retrieval workflow step
 */
export type DefaultAlertRetrievalInput = z.infer<typeof DefaultAlertRetrievalInput>;
export declare const DefaultAlertRetrievalInput: z.ZodObject<
  {
    alerts_index_pattern: z.ZodString;
    anonymization_fields: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          timestamp: z.ZodOptional<z.ZodString>;
          field: z.ZodString;
          allowed: z.ZodOptional<z.ZodBoolean>;
          anonymized: z.ZodOptional<z.ZodBoolean>;
          updatedAt: z.ZodOptional<z.ZodString>;
          updatedBy: z.ZodOptional<z.ZodString>;
          createdAt: z.ZodOptional<z.ZodString>;
          createdBy: z.ZodOptional<z.ZodString>;
          namespace: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
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
    filter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    size: z.ZodNumber;
    start: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodString>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
  },
  z.core.$strip
>;
/**
 * Output from the default alert retrieval workflow step
 */
export type DefaultAlertRetrievalOutput = z.infer<typeof DefaultAlertRetrievalOutput>;
export declare const DefaultAlertRetrievalOutput: z.ZodObject<
  {
    alerts: z.ZodArray<z.ZodString>;
    replacements: z.ZodObject<{}, z.core.$catchall<z.ZodString>>;
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
    connector_name: z.ZodOptional<z.ZodString>;
    alerts_context_count: z.ZodNumber;
    anonymized_alerts: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            metadata: z.ZodObject<{}, z.core.$strip>;
            page_content: z.ZodString;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
