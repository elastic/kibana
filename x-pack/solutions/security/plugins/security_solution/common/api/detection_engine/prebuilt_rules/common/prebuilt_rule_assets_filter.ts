/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

// API design document (internal): https://docs.google.com/document/d/1AYlt8wJMoLD-V_owAd4qL-h76IOVnfDCZ77VNmmf-Ks
export type PrebuiltRuleAssetsFilter = z.infer<typeof PrebuiltRuleAssetsFilter>;
export const PrebuiltRuleAssetsFilter = z.object({
  fields: z.object({
    name: z
      .object({
        include: z.object({ values: z.array(z.string()) }).optional(),
        exclude: z.object({ values: z.array(z.string()) }).optional(),
      })
      .optional(),
    tags: z
      .object({
        include: z.object({ values: z.array(z.string()) }).optional(),
        exclude: z.object({ values: z.array(z.string()) }).optional(),
      })
      .optional(),
  }),
});
