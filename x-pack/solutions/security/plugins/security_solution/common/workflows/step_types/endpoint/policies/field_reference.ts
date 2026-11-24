/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { PolicyOperatingSystem } from '../../../../endpoint/types/os';

import { POLICY_IDENTIFIER_MAX_LENGTH, policyPathInputSchema } from './input_schemas';

export const RESULT_LIMIT = 10;

export const policyFieldKeywordsInputSchema = lazySchema(() =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(POLICY_IDENTIFIER_MAX_LENGTH)
        .refine((keyword) => !/\s/.test(keyword), {
          message: 'Keywords are single words; send separate words or one word such as antivirus.',
        })
    )
    .min(1)
    .max(5)
);

export const policyFieldOsInputSchema = lazySchema(() =>
  z.enum(
    Object.values(PolicyOperatingSystem).map((value) => `${value}` as const),
    {
      message: "os must be one of 'windows', 'mac', or 'linux'; use 'mac' for macOS.",
    }
  )
);

export const createPolicyFieldReferenceSelectorSchema = ({
  path = policyPathInputSchema.describe(
    'Exact registry path, protection key, or supported OS-less remainder.'
  ),
  keywords = policyFieldKeywordsInputSchema.describe(
    'One to five single-word keywords matched against registry paths or shared UI labels.'
  ),
  os = policyFieldOsInputSchema
    .optional()
    .describe('Optional operating-system filter for keyword search.'),
} = {}) => z.union([z.object({ path }).strict(), z.object({ keywords, os }).strict()]);

export const policyFieldReferenceSelectorInputSchema = lazySchema(() =>
  createPolicyFieldReferenceSelectorSchema()
);

export type GetPolicyFieldReferenceSelector = z.infer<
  typeof policyFieldReferenceSelectorInputSchema
>;
