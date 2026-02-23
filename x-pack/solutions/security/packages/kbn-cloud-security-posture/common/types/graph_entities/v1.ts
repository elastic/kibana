/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  entitiesRequestSchema,
  entitiesResponseSchema,
  entityItemSchema,
} from '../../schema/graph_entities/v1';
import { REACHED_NODES_LIMIT } from '../../schema/graph/v1';

export type EntitiesRequest = TypeOf<typeof entitiesRequestSchema>;
export type EntitiesResponse = Omit<TypeOf<typeof entitiesResponseSchema>, 'messages'> & {
  messages?: ApiMessageCode[];
};
export type EntityItem = TypeOf<typeof entityItemSchema>;

// Use const object instead of enum to avoid isolatedModules issues with computed values
export const ApiMessageCode = {
  ReachedNodesLimit: REACHED_NODES_LIMIT,
} as const;
export type ApiMessageCode = (typeof ApiMessageCode)[keyof typeof ApiMessageCode];
