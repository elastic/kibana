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

export type EntitiesRequest = TypeOf<typeof entitiesRequestSchema>;
export type EntitiesResponse = TypeOf<ReturnType<typeof entitiesResponseSchema>>;
export type EntityItem = TypeOf<typeof entityItemSchema>;
