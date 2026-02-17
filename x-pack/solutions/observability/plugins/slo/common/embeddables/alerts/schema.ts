/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const SloItemSchema = schema.object({
  id: schema.string(),
  instance_id: schema.string(),
  name: schema.string(),
  group_by: schema.string(),
});

export const AlertsCustomSchema = schema.object({
  slos: schema.arrayOf(SloItemSchema),
  show_all_group_by_instances: schema.maybe(schema.boolean()),
});

export const legacySloItemSchema = schema.object({
  id: schema.string(),
  instanceId: schema.string(),
  name: schema.string(),
  groupBy: schema.string(),
});

export const legacyAlertsCustomSchema = schema.object({
  slos: schema.arrayOf(legacySloItemSchema),
  showAllGroupByInstances: schema.maybe(schema.boolean()),
});

export type LegacyAlertsEmbeddableState = TypeOf<typeof legacyAlertsCustomSchema>;
export type AlertsCustomState = TypeOf<typeof AlertsCustomSchema>;
