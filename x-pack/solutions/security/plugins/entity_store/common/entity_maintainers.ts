/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const LicenseType = z.enum(['basic', 'standard', 'gold', 'platinum', 'enterprise', 'trial']);

export type EntityMaintainerTaskStatus = z.infer<typeof EntityMaintainerTaskStatus>;
export const EntityMaintainerTaskStatus = z.enum(['never_started', 'started', 'stopped']);

export type EntityMaintainerResponseItem = z.infer<typeof EntityMaintainerResponseItem>;
export const EntityMaintainerResponseItem = z.object({
  id: z.string(),
  taskStatus: EntityMaintainerTaskStatus,
  interval: z.string(),
  description: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  minLicense: LicenseType,
  customState: z.record(z.string(), z.unknown()).nullable(),
  runs: z.number(),
  lastSuccessTimestamp: z.string().nullable(),
  lastErrorTimestamp: z.string().nullable(),
});

export type GetEntityMaintainersResponse = z.infer<typeof GetEntityMaintainersResponse>;
export const GetEntityMaintainersResponse = z.object({
  maintainers: z.array(EntityMaintainerResponseItem),
});
