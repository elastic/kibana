/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

export const syntheticsCCSSettingsSchema = lazySchema(() =>
  z.looseObject({
    useAllRemoteClusters: z.boolean(),
    selectedRemoteClusters: z.array(z.string()),
  })
);

export const syntheticsMultiSpaceSettingsSchema = lazySchema(() =>
  z.looseObject({
    useAllRemoteClusters: z.boolean().optional(),
    selectedRemoteClusters: z.array(z.string()).optional(),
  })
);

export const APIKeyCodec = lazySchema(() =>
  z.looseObject({
    spaces: z.array(z.string()),
  })
);

export const SyntheticsServiceApiKeyType = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    name: z.string(),
    apiKey: z.string(),
  })
);

export const SyntheticsServiceApiKeySaveType = lazySchema(() =>
  z.looseObject({
    success: z.boolean(),
    error: z.string().optional(),
  })
);
