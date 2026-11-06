/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsOf } from '../../../lib/create_digital_experience_traced_es_client';
import type { errorsSearch } from './search_request';

/** `errorsSearch`: the error groups in the selected environment, and every environment. */
export type ErrorsAggregations = AggregationsOf<ReturnType<typeof errorsSearch>>;

/** The errors of one type and stack trace; the key is `[type, stacktrace]`. */
export type ErrorGroupBucket =
  ErrorsAggregations['inEnvironment']['exceptions']['groups']['buckets'][number];

/** The latest error of a group, as `top_hits` returns it with `fields`. */
export type MessageAggregation = ErrorGroupBucket['message'];
