/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of terms allowed in a single `terms` query before Elasticsearch
 * rejects the request. Defaults to `index.max_terms_count` (65536) minus one so we
 * stay within the default cluster limit without requiring index setting changes.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html
 */
export const DEFAULT_MAX_TERMS_QUERY_COUNT = 65535;
