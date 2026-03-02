/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './observed_details';
export type * from './common';

// Import from model only to avoid loading api/search_strategy index (and its zod discriminatedUnion)
// during plugin init; the full index pulls in all schema modules and can cause init-order errors.
export { ServicesQueries } from '../../../api/search_strategy/model/factory_query_type';
