/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export type PostValidateRequestBody = z.infer<typeof PostValidateRequestBody>;
export declare const PostValidateRequestBody: z.ZodObject<
  {
    alerts_context_count: z.ZodNumber;
    anonymized_alerts: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          metadata: z.ZodObject<{}, z.core.$strip>;
          page_content: z.ZodString;
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
    attack_discoveries: z.ZodArray<
      z.ZodObject<
        {
          alert_ids: z.ZodArray<z.ZodString>;
          id: z.ZodOptional<z.ZodString>;
          details_markdown: z.ZodString;
          entity_summary_markdown: z.ZodOptional<z.ZodString>;
          mitre_attack_tactics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          summary_markdown: z.ZodString;
          title: z.ZodString;
          timestamp: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    connector_name: z.ZodString;
    enable_field_rendering: z.ZodBoolean;
    generation_uuid: z.ZodString;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    with_replacements: z.ZodBoolean;
  },
  z.core.$strip
>;
export type PostValidateRequestBodyInput = z.input<typeof PostValidateRequestBody>;
export type PostValidateResponse = z.infer<typeof PostValidateResponse>;
export declare const PostValidateResponse: z.ZodObject<
  {
    duplicates_dropped_count: z.ZodNumber;
    validated_discoveries: z.ZodArray<
      z.ZodObject<
        {
          alert_ids: z.ZodArray<z.ZodString>;
          alert_rule_uuid: z.ZodOptional<z.ZodString>;
          alert_workflow_status: z.ZodOptional<z.ZodString>;
          connector_id: z.ZodString;
          connector_name: z.ZodString;
          alert_start: z.ZodOptional<z.ZodString>;
          alert_updated_at: z.ZodOptional<z.ZodString>;
          alert_updated_by_user_id: z.ZodOptional<z.ZodString>;
          alert_updated_by_user_name: z.ZodOptional<z.ZodString>;
          alert_workflow_status_updated_at: z.ZodOptional<z.ZodString>;
          details_markdown: z.ZodString;
          entity_summary_markdown: z.ZodOptional<z.ZodString>;
          generation_uuid: z.ZodString;
          id: z.ZodString;
          mitre_attack_tactics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
          risk_score: z.ZodOptional<z.ZodNumber>;
          summary_markdown: z.ZodString;
          timestamp: z.ZodString;
          title: z.ZodString;
          user_id: z.ZodOptional<z.ZodString>;
          user_name: z.ZodOptional<z.ZodString>;
          users: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  id: z.ZodOptional<z.ZodString>;
                  name: z.ZodOptional<z.ZodString>;
                },
                z.core.$strip
              >
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
