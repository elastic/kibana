/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Zod transform that accepts both string[] and JSON-serialized string.
 *
 * Elastic Workflows liquid templates serialize arrays to strings when passing
 * data between steps (e.g. {{steps.fetch_alerts.result.alert_ids}}).
 * Raw Zod z.array(z.string()) fails silently on these serialized forms.
 *
 * This schema handles:
 * - Native arrays: ['id1', 'id2'] → ['id1', 'id2']
 * - JSON strings: '["id1","id2"]' → ['id1', 'id2']
 * - Comma-separated: 'id1,id2' → ['id1', 'id2']
 * - Empty/null: '' → []
 */
export const LiquidArraySchema = z
  .union([z.array(z.string()), z.string()])
  .transform((val): string[] => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return val.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  });

/**
 * Same as LiquidArraySchema but for Record<string, string[]> (e.g. alert_ids_by_case).
 * Handles JSON-serialized objects from liquid templates.
 */
export const LiquidRecordSchema = z
  .union([z.record(z.string(), z.array(z.string())), z.string()])
  .transform((val): Record<string, string[]> => {
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (!val || typeof val !== 'string') return {};
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
