/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      lastExecutionTimestamp: state.lastExecutionTimestamp || undefined,
      lastComparisonTookSeconds: state.lastComparisonTookSeconds || 0,
      runs: state.runs || 0,
      namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
      hostsCompared: state.hostsCompared || 0,
      driftEventsGenerated: state.driftEventsGenerated || 0,
    }),
    schema: schema.object({
      lastExecutionTimestamp: schema.maybe(schema.string()),
      lastComparisonTookSeconds: schema.number(),
      runs: schema.number(),
      namespace: schema.string(),
      hostsCompared: schema.number(),
      driftEventsGenerated: schema.number(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const defaultState: LatestTaskStateSchema = {
  lastExecutionTimestamp: undefined,
  lastComparisonTookSeconds: 0,
  runs: 0,
  namespace: 'default',
  hostsCompared: 0,
  driftEventsGenerated: 0,
};
