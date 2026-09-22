/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const PrivateLocationCodec = z.looseObject({
  label: z.string(),
  id: z.string(),
  agentPolicyId: z.string(),
  isServiceManaged: z.boolean().optional(),
  isInvalid: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  geo: z
    .looseObject({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  namespace: z.string().optional(),
  spaces: z.array(z.string()).optional(),
  isAgentSharding: z.boolean().optional(),
});

export const SyntheticsPrivateLocationsType = z.array(PrivateLocationCodec);
