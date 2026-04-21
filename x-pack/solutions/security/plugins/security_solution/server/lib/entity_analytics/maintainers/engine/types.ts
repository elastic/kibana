/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export interface CompositeAfterKey {
  [key: string]: string | null;
}

export interface CompositeBucket {
  key: CompositeAfterKey;
  doc_count: number;
}

export type RelationshipType = 'accesses' | 'communicates_with';
export type TargetEntityType = 'host' | 'user' | 'service';

/**
 * Declarative config for one integration feeding a relationship maintainer.
 * The generic engine reads this to build composite agg queries and ES|QL queries
 * without any bespoke TypeScript per integration.
 */
export interface RelationshipIntegrationConfig {
  /** Unique machine-readable identifier, e.g. 'elastic_defend'. */
  id: string;
  /** Human-readable name used in log messages. */
  name: string;
  /** Returns the Elasticsearch index pattern for this integration in the given namespace. */
  indexPattern: (namespace: string) => string;
  /** Which relationship type this config populates. */
  relationshipType: RelationshipType;
  /** Entity type of the relationship target (controls the default target EVAL). */
  targetEntityType: TargetEntityType;
  /**
   * Integration-specific DSL filters for the composite aggregation query.
   * The generic builder wraps these with timestamp, user-ID-existence, and
   * (for 'accesses') host-ID-existence + event.outcome:success filters.
   */
  compositeAggFilters: QueryDslQueryContainer[];
  /**
   * Integration-specific ESQL WHERE clause (the part that varies per integration).
   * For 'accesses': timestamp, user/host ID existence, and event.outcome == "success"
   * are added automatically. For 'communicates_with': all needed filters must be here.
   */
  esqlWhereClause: string;
  /**
   * Optional ESQL expression for the actor EUID.
   * Defaults to euid.esql.getEuidEvaluation('user', { withTypeId: true }).
   * Required only for integrations with non-ECS actor fields (e.g. azure_auditlogs).
   */
  actorEvalOverride?: string;
  /**
   * Optional ESQL expression for the target entity ID.
   * Defaults to euid.esql.getEuidEvaluation(targetEntityType, { withTypeId: true }).
   * Required for integrations with non-standard target fields (e.g. okta, aws_cloudtrail communicates_with).
   */
  targetEvalOverride?: string;
  /**
   * Optional additional filter appended after the standard empty-guard post-EVAL.
   * Use when the target eval can produce non-empty but semantically empty EUIDs.
   * Example: 'AND targetEntityId != "user:@okta"' for okta.
   */
  additionalTargetFilter?: string;
  /**
   * Fully overrides the composite aggregation builder.
   * Required for integrations whose actor is not in standard ECS user.* fields
   * and therefore cannot use the shared composite sources (e.g. azure_auditlogs).
   */
  buildCompositeAggOverride?: (afterKey?: CompositeAfterKey) => Record<string, unknown>;
  /**
   * Fully overrides the bucket user-filter builder.
   * Required when buildCompositeAggOverride is provided and uses a non-standard field.
   */
  buildBucketFilterOverride?: (buckets: CompositeBucket[]) => QueryDslQueryContainer;
  /**
   * Fully overrides the ES|QL query builder.
   * Required for integrations with complex multi-type targets or non-ECS actor fields.
   */
  esqlQueryOverride?: (namespace: string) => string;
  /**
   * Frequency threshold for accesses_frequently vs accesses_infrequently classification.
   * Only used when relationshipType === 'accesses'. Default: 4.
   */
  frequencyThreshold?: number;
}

/**
 * Output record from the generic postprocessor.
 * Each relationship's targets are stored as raw entity.id values (EUIDs) under
 * raw_identifiers['entity.id']. The relationship resolver later confirms which
 * of these EUIDs exist in the entity store and promotes them to ids.
 */
export interface ProcessedEngineRecord {
  /** Full EUID with type prefix, e.g. "user:alice@okta". Null if actor eval failed. */
  entityId: string | null;
  entityType: 'user';
  /**
   * Map of relationship type key → raw entity.id array.
   * For 'accesses': keys are 'accesses_frequently' and 'accesses_infrequently'.
   * For 'communicates_with': key is 'communicates_with'.
   */
  relationships: Record<string, { 'entity.id': string[] }>;
}
