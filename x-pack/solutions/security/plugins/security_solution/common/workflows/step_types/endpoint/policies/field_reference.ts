/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { POLICY_IDENTIFIER_MAX_LENGTH, policyPathInputSchema } from './input_schemas';

export const getPolicyFieldReferenceParamsSchema = lazySchema(() =>
  z
    .object({
      path: policyPathInputSchema.optional(),
      keywords: z
        .array(
          z
            .string()
            .trim()
            .min(1)
            .max(POLICY_IDENTIFIER_MAX_LENGTH)
            .refine((keyword) => !/\s/.test(keyword), {
              message:
                'Keywords are single words; send separate words or one word such as antivirus.',
            })
        )
        .min(1)
        .max(5)
        .optional(),
      os: z
        .enum(['windows', 'mac', 'linux'], {
          message: "os must be one of 'windows', 'mac', or 'linux'; use 'mac' for macOS.",
        })
        .optional(),
    })
    .strict()
);

export type GetPolicyFieldReferenceSelector = Readonly<
  { path: string } | { keywords: readonly string[]; os?: 'windows' | 'mac' | 'linux' }
>;

export const policyFieldReferenceSelectorInputSchema = lazySchema(() => {
  const fieldReferencePathSelectorSchema = z
    .object({
      path: getPolicyFieldReferenceParamsSchema.shape.path
        .unwrap()
        .describe('Exact registry path, protection key, or supported OS-less remainder.'),
    })
    .strict();

  const fieldReferenceKeywordsSelectorSchema = z
    .object({
      keywords: getPolicyFieldReferenceParamsSchema.shape.keywords
        .unwrap()
        .describe(
          'One to five single-word keywords matched against registry paths or shared UI labels.'
        ),
      os: getPolicyFieldReferenceParamsSchema.shape.os
        .optional()
        .describe('Optional operating-system filter for keyword search.'),
    })
    .strict();

  return z.union([fieldReferencePathSelectorSchema, fieldReferenceKeywordsSelectorSchema]);
});
