/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ENDPOINT_CONFIG_PRESET_DATA_COLLECTION,
  ENDPOINT_CONFIG_PRESET_EDR_COMPLETE,
  ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL,
  ENDPOINT_CONFIG_PRESET_NGAV,
} from '../../../../fleet_integration/constants';

export const POLICY_PATH_MAX_LENGTH = 256;
export const POLICY_IDENTIFIER_MAX_LENGTH = 512;

export const policyIdentifierInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(POLICY_IDENTIFIER_MAX_LENGTH);

export const policyPathInputSchema = z.string().trim().min(1).max(POLICY_PATH_MAX_LENGTH);

export const ENDPOINT_POLICY_BASELINE_PRESETS = [
  ENDPOINT_CONFIG_PRESET_EDR_COMPLETE,
  ENDPOINT_CONFIG_PRESET_NGAV,
  ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL,
  ENDPOINT_CONFIG_PRESET_DATA_COLLECTION,
] as const;

export type EndpointPolicyBaselinePreset = (typeof ENDPOINT_POLICY_BASELINE_PRESETS)[number];

const baselinePresetDescription =
  'A supported endpoint deployment preset. Mutually exclusive with idOrName; this selects the deployment default rather than a live policy.';
const policyIdentifierDescription =
  'Saved-object id or exact full stored endpoint policy name in the current space. Mutually exclusive with preset. A presented name with name_string_truncated true is display-only; pass the policy id as later idOrName.';

export const policyReferenceInputSchema = z
  .object({
    idOrName: policyIdentifierInputSchema.optional().describe(policyIdentifierDescription),
    preset: z.enum(ENDPOINT_POLICY_BASELINE_PRESETS).optional().describe(baselinePresetDescription),
  })
  .strict()
  .refine(({ idOrName, preset }) => (idOrName !== undefined) !== (preset !== undefined), {
    message: 'Exactly one of idOrName or preset must be provided',
  });

export type PolicyReferenceInput = z.infer<typeof policyReferenceInputSchema>;

export type PolicyRef =
  | Readonly<{ type: 'policy'; idOrName: string }>
  | Readonly<{ type: 'baseline'; preset: EndpointPolicyBaselinePreset }>;

export const toPolicyRef = (input: PolicyReferenceInput): PolicyRef => {
  if (input.idOrName !== undefined) {
    return { type: 'policy', idOrName: input.idOrName };
  }

  if (input.preset !== undefined) {
    return { type: 'baseline', preset: input.preset };
  }

  throw new Error('Invalid policy reference');
};
