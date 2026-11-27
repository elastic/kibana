/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ENDPOINT_POLICY_PRESET } from '../../../../endpoint/constants';
import { policyIdentifierInputSchema } from './input_schemas';

const ENDPOINT_POLICY_BASELINE_PRESETS = [
  ENDPOINT_POLICY_PRESET.EDR_COMPLETE,
  ENDPOINT_POLICY_PRESET.NGAV,
  ENDPOINT_POLICY_PRESET.EDR_ESSENTIAL,
  ENDPOINT_POLICY_PRESET.DATA_COLLECTION,
] as const;
export const policyBaselinePresetInputSchema = lazySchema(() =>
  z.enum(ENDPOINT_POLICY_BASELINE_PRESETS)
);
export const createPolicyReferenceInputSchema = (
  idOrName = policyIdentifierInputSchema,
  preset = policyBaselinePresetInputSchema
) => z.union([z.object({ idOrName }).strict(), z.object({ preset }).strict()]);
export const policyReferenceInputSchema = lazySchema(() => createPolicyReferenceInputSchema());
export type PolicyReferenceInput = z.infer<typeof policyReferenceInputSchema>;
