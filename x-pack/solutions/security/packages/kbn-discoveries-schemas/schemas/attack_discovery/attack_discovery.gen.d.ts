/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/**
 * An attack discovery generated from one or more alerts
 */
export type AttackDiscovery = z.infer<typeof AttackDiscovery>;
export declare const AttackDiscovery: z.ZodObject<
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
>;
/**
 * Array of attack discoveries
 */
export type AttackDiscoveries = z.infer<typeof AttackDiscoveries>;
export declare const AttackDiscoveries: z.ZodArray<
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
