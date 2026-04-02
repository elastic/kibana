/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CompositeAfterKey, CompositeBucket } from '../types';

/**
 * Defines the query-generation contract for a single data integration
 * (e.g. Elastic Defend, Active Directory, Okta).
 *
 * The accesses maintainer iterates over every registered integration,
 * running its composite aggregation + ES|QL pipeline, then merges
 * all resulting records before upserting to the entity store.
 */
export interface AccessesIntegrationConfig {
  /** Unique machine-readable identifier (e.g. 'elastic_defend') */
  id: string;

  /** Human-readable name used in log messages */
  name: string;

  /** Returns the Elasticsearch index pattern for this integration in the given namespace */
  getIndexPattern: (namespace: string) => string;

  /** Builds the composite aggregation body (query filters + composite agg definition) */
  buildCompositeAggQuery: (afterKey?: CompositeAfterKey) => Record<string, unknown>;

  /** Builds a bool/should filter to scope ES|QL to the users found in a composite page */
  buildBucketUserFilter: (buckets: CompositeBucket[]) => QueryDslQueryContainer;

  /** Builds the ES|QL query that computes access frequency. */
  buildEsqlQuery: (namespace: string) => string;
}
