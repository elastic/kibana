/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '@kbn/entity-store/common';

import type { CompositeAfterKey, CompositeBucket } from '../types';

export interface CommunicatesWithIntegrationConfig {
  id: string;
  name: string;
  entityType: EntityType;
  getIndexPattern: (namespace: string) => string;
  buildCompositeAggQuery: (afterKey?: CompositeAfterKey) => Record<string, unknown>;
  buildBucketUserFilter: (buckets: CompositeBucket[]) => QueryDslQueryContainer;
  buildEsqlQuery: (namespace: string) => string;
}
