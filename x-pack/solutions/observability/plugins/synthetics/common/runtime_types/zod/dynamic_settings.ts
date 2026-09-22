/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const DefaultEmailCodec = z.looseObject({
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
});

export const DynamicSettingsSaveCodec = z.looseObject({
  success: z.boolean(),
  error: z.string().optional(),
});

export const DynamicSettingsCodec = z.looseObject({
  certAgeThreshold: z.number(),
  certExpirationThreshold: z.number(),
  defaultConnectors: z.array(z.string()),
  defaultEmail: DefaultEmailCodec.optional(),
  defaultTLSRuleEnabled: z.boolean().optional(),
  defaultStatusRuleEnabled: z.boolean().optional(),
  privateLocationsSyncInterval: z.number().optional(),
  rebalancePrivateLocationShardsEnabled: z.boolean().optional(),
});

export const LocationMonitorsType = z.array(
  z.looseObject({
    id: z.string(),
    count: z.number(),
  })
);
