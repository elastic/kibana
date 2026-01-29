/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may use this file only in compliance with the Elastic License 2.0.
 */

import { z } from '@kbn/zod';

export type EntityStoreStatus = z.infer<typeof EntityStoreStatus>;
export const EntityStoreStatus = z.enum([
  'not_installed',
  'installing',
  'running',
  'stopped',
  'error',
]);

export const EngineComponentResource = z.enum([
  'entity_definition',
  'index_template',
  'task',
  'index',
  'ilm_policy',
  'component_template',
]);
export type EngineComponentResource = z.infer<typeof EngineComponentResource>;

export type EngineComponentStatus = z.infer<typeof EngineComponentStatus>;
export const EngineComponentStatus = z.object({
  id: z.string(),
  installed: z.boolean(),
  resource: EngineComponentResource,
  enabled: z.boolean().optional(),
  status: z.string().optional(),
  lastExecutionTimestamp: z.string().optional(),
  runs: z.number().optional(),
  lastError: z.string().optional(),
});
