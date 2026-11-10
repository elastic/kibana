/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsOf } from '../../../lib/create_digital_experience_traced_es_client';
import type { usageSearch } from './search_request';

/** `usageSearch`: the panels below the KPIs, in the selected environment. */
export type UsageAggregations = AggregationsOf<ReturnType<typeof usageSearch>>;
