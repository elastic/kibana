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
  'An explicitly requested deployment baseline, not a live policy. Do not also pass a live identity; omit the unused selector entirely. Valid: {"preset":"EDRComplete"}. Invalid: {"idOrName":"Example policy","preset":"EDRComplete"}.';
const policyIdentifierDescription =
  'User-supplied live policy identity: saved-object id or exact full stored endpoint policy name in the current space, or a returned policy id. Do not also pass a preset; a creation preset does not select the live policy. Valid: {"idOrName":"Example policy"}. Invalid: {"idOrName":"Example policy","preset":"EDRComplete"}. Omit the unused property entirely. A presented name with name_string_truncated true is display-only; pass the policy id as later idOrName.';

export const policyReferenceInputSchema = z
  .object({
    idOrName: policyIdentifierInputSchema.optional().describe(policyIdentifierDescription),
    preset: z.enum(ENDPOINT_POLICY_BASELINE_PRESETS).optional().describe(baselinePresetDescription),
  })
  .strict();

export type PolicyReferenceInput = z.infer<typeof policyReferenceInputSchema>;

export type PolicyRef =
  | Readonly<{ type: 'policy'; idOrName: string }>
  | Readonly<{ type: 'baseline'; preset: EndpointPolicyBaselinePreset }>;

export const toPolicyRef = (input: PolicyReferenceInput): PolicyRef => {
  if (input.idOrName !== undefined && input.preset !== undefined) {
    throw new Error('Invalid policy reference');
  }

  if (input.idOrName !== undefined) {
    return { type: 'policy', idOrName: input.idOrName };
  }

  if (input.preset !== undefined) {
    return { type: 'baseline', preset: input.preset };
  }

  throw new Error('Invalid policy reference');
};
