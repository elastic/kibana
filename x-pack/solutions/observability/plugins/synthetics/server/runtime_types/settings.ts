/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../../common/runtime_types/schema_output';

const DefaultEmailCodec = z.object({
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
});

export const DynamicSettingsAttributesCodec = z.object({
  certAgeThreshold: z.number(),
  certExpirationThreshold: z.number(),
  defaultConnectors: z.array(z.string()),
  defaultEmail: DefaultEmailCodec.optional(),
  defaultStatusRuleEnabled: z.boolean().optional(),
  defaultTLSRuleEnabled: z.boolean().optional(),
  rebalancePrivateLocationShardsEnabled: z.boolean().optional(),
});

// `DynamicSettingsAttributes` isolates the Saved Object's attributes from the API response.
export type DynamicSettingsAttributes = SchemaOutput<typeof DynamicSettingsAttributesCodec>;
