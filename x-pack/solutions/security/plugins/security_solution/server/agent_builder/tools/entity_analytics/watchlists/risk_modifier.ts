/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * The discrete `riskModifier` values accepted by watchlist tools. Mirrors the
 * server-side OpenAPI constraint (`z.number().min(0).max(2)`) but tightens it
 * to a 0.5-step ladder (as required by the UI, see `../../../../../public/flyout/entity_details/watchlists_right/watchlist_form.tsx`).
 */
export const ALLOWED_RISK_MODIFIERS = [0, 0.5, 1, 1.5, 2] as const;

type RiskModifier = (typeof ALLOWED_RISK_MODIFIERS)[number];

export const riskModifierSchema = z
  .number()
  .refine((v): v is RiskModifier => ALLOWED_RISK_MODIFIERS.includes(v as RiskModifier), {
    message: 'Must be one of: 0, 0.5, 1, 1.5, or 2',
  });

/**
 * Renders a `riskModifier` as `<value> (<human-readable meaning>)` for HITL
 * confirmation messages
 */
export const formatRiskModifier = (value: number): string => {
  if (value === 1) return `${value} (no change to entity risk scores)`;
  if (value === 0) return `${value} (risk scores zeroed out)`;
  return `${value} (risk scores multiplied by ${value})`;
};
