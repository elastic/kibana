/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export type CreateAttackDiscoveryAlertsParams = z.infer<typeof CreateAttackDiscoveryAlertsParams>;
export declare const CreateAttackDiscoveryAlertsParams: z.ZodObject<
  {
    alerts_context_count: z.ZodNumber;
    anonymized_alerts: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          metadata: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
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
