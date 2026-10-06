/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

export const DefaultEmailCodec = lazySchema(() =>
  z.looseObject({
    to: z.array(z.string()),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
  })
);

export const DynamicSettingsSaveCodec = lazySchema(() =>
  z.looseObject({
    success: z.boolean(),
    error: z.string().optional(),
  })
);

export const DynamicSettingsCodec = lazySchema(() =>
  z.looseObject({
    certAgeThreshold: z.number(),
    certExpirationThreshold: z.number(),
    defaultConnectors: z.array(z.string()),
    defaultEmail: DefaultEmailCodec.optional(),
    defaultTLSRuleEnabled: z.boolean().optional(),
    defaultStatusRuleEnabled: z.boolean().optional(),
    privateLocationsSyncInterval: z.number().optional(),
    rebalancePrivateLocationShardsEnabled: z.boolean().optional(),
  })
);

export const LocationMonitorsType = lazySchema(() =>
  z.array(
    z.looseObject({
      id: z.string(),
      count: z.number(),
      browserCount: z.number(),
    })
  )
);
