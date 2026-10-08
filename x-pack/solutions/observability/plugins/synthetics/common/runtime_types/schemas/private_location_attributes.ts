/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

export const PrivateLocationAttributesCodec = lazySchema(() =>
  z.looseObject({
    label: z.string(),
    id: z.string(),
    agentPolicyId: z.string(),
    isServiceManaged: z.boolean(),
    tags: z.array(z.string()).optional(),
    geo: z
      .looseObject({
        lat: z.number(),
        lon: z.number(),
      })
      .optional(),
    namespace: z.string().optional(),
    spaces: z.array(z.string()).optional(),
  })
);

export const SyntheticsPrivateLocationsAttributesCodec = lazySchema(() =>
  z.looseObject({
    locations: z.array(PrivateLocationAttributesCodec),
  })
);

export type PrivateLocationAttributes = z.infer<typeof PrivateLocationAttributesCodec>;
export type SyntheticsPrivateLocationsAttributes = z.infer<
  typeof SyntheticsPrivateLocationsAttributesCodec
>;
