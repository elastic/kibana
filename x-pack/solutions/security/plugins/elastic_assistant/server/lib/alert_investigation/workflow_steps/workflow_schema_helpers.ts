/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Runtime parser for array values passed between workflow steps.
 *
 * The workflow engine does NOT run Zod transforms on step inputs at runtime —
 * context.input is the raw rendered value from the template engine.
 * Use this function in handlers to parse the input.
 */
export const parseArrayInput = (val: unknown): string[] => {
  if (Array.isArray(val)) {
    // Zod wraps the | json output: ["[\"id1\",\"id2\"]"] — array with 1 JSON string element
    if (val.length === 1) {
      const inner = val[0];
      if (Array.isArray(inner)) return inner.map(String);
      if (typeof inner === 'string') {
        try {
          const parsed = JSON.parse(inner);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          // not JSON, fall through
        }
      }
    }
    return val.flatMap((item) => {
      if (Array.isArray(item)) return item.map(String);
      return [String(item)];
    });
  }
  if (!val) return [];
  const strVal = String(val);
  if (!strVal) return [];
  try {
    const parsed = JSON.parse(strVal);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return strVal.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
};

/**
 * Runtime parser for Record<string, string[]> values passed between workflow steps.
 */
export const parseRecordInput = (val: unknown): Record<string, string[]> => {
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return val as Record<string, string[]>;
  }
  if (!val || typeof val !== 'string') return {};
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

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
    const strVal = String(val);
    try {
      const parsed = JSON.parse(strVal);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return strVal.split(',').map((s: string) => s.trim()).filter(Boolean);
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
