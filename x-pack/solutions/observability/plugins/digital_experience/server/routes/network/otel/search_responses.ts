/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsOf } from '../../../lib/create_digital_experience_traced_es_client';
import type { httpRequestsSearch, resourcesSearch } from './search_requests';

/** `resourcesSearch`: the resources in the selected environment, and every environment. */
export type ResourcesAggregations = AggregationsOf<ReturnType<typeof resourcesSearch>>;

/** `httpRequestsSearch`: the HTTP requests in the selected environment, and every environment. */
export type HttpRequestsAggregations = AggregationsOf<ReturnType<typeof httpRequestsSearch>>;
