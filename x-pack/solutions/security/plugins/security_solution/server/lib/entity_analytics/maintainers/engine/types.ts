/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityRelationshipKey } from '@kbn/entity-store/common/domain/definitions/common_fields';

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
   * Integration-specific ESQL WHERE clause — the single source of integration-specific
   * query logic. The engine adds only timestamp + actor-identity + (optional)
   * target-EUID existence filters; everything else (event.action, event.outcome,
   * etc.) belongs here.
   */
  esqlWhereClause: string;
  /**
   * Additional DSL filters applied to the composite aggregation (Step 1).
   * Use this to mirror the same data-shape narrowing that `esqlWhereClause` applies
   * in Step 2 (e.g. event.action / event.outcome term filters), so the actors
   * surfaced in Step 1 actually have matching documents in Step 2.
   */
  compositeAggAdditionalFilters?: QueryDslQueryContainer[];
  /**
   * When true, both Step 1 (composite agg) and Step 2 (ES|QL) require the source
   * document to contain a resolvable EUID for `targetEntityType`. Use this for
   * integrations whose target field is mandatory on every event (e.g. logon
   * events always carry a host). The gate is parameterized by `targetEntityType`,
   * so a user-targeted config with this flag emits a `user.*` existence check
   * and a host-targeted config emits a `host.*` existence check.
   *
   * Setting it makes Step 1 and Step 2 narrow consistently — without it, an
   * `esqlWhereClause` that filters to events with a target EUID would still
   * surface actors in Step 1 who never appear in such events, wasting Step 2
   * work and risking MAX_ITERATIONS exhaustion.
   */
  requireTargetEntityIdExists?: boolean;
  /**
   * Actor field names used as composite aggregation sources and bucket filter keys.
   * Defaults to ECS user identity fields. Set this for integrations whose actor is
   * not in standard ECS user.* fields (e.g. azure_auditlogs).
   */
  actorFields?: string[];
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
   * Fully overrides the ES|QL query builder. Use only when the standard builder cannot
   * express the integration's query (e.g. multi-type targets, non-ECS actor fields).
   *
   * When set, the following engine-provided behaviours are NOT applied:
   * - actor / target EUID existence filters
   * - getFieldEvaluationsEsql / getEuidEvaluation helpers (future source-field changes
   *   will not propagate automatically)
   * - bucketTargetsByAccessCount access-count classification
   * - LIMIT COMPOSITE_PAGE_SIZE ceiling
   *
   * Column contract — the query MUST emit these exact column names or results will be
   * silently empty:
   * - `actorUserId` (string) — the actor's full EUID, e.g. "user:alice@okta"
   * - when bucketTargetsByAccessCount is set:
   *     `accesses_frequently` and `accesses_infrequently` (string | string[])
   * - otherwise:
   *     a column named after `relationshipType` (e.g. `communicates_with`) (string | string[])
   */
  esqlQueryOverride?: (namespace: string) => string;
  /**
   * When set, the engine classifies targets into two buckets by access count and
   * emits two relationship columns instead of one. Set this only on relationship
   * patterns whose semantics call for it. Omit for relationships that should
   * produce a flat targets-per-actor list.
   *
   * Every field is required so the engine carries no implicit data-tuning
   * defaults and the bucket relationship keys are declared explicitly at the
   * config call site (no engine-level coupling to specific schema field names).
   *
   * - `threshold`: actor→target pairs with `COUNT(*) >= threshold` are classified
   *    into `aboveThresholdRelationship`, the rest into `belowThresholdRelationship`.
   * - `aboveThresholdRelationship` / `belowThresholdRelationship`: the two
   *    `entity.relationships.<key>` keys this maintainer writes to. Both must be
   *    members of the entity store's `EntityRelationshipKey` union (TypeScript
   *    enforces this).
   */
  bucketTargetsByAccessCount?: {
    threshold: number;
    aboveThresholdRelationship: EntityRelationshipKey;
    belowThresholdRelationship: EntityRelationshipKey;
  };
}

/**
 * Output record from the generic postprocessor.
 * Each relationship's targets are stored as optimistic EUIDs computed in the ES|QL layer.
 */
export interface ProcessedEngineRecord {
  /** Full EUID with type prefix, e.g. "user:alice@okta". Null if actor eval failed. */
  entityId: string | null;
  entityType: 'user';
  /**
   * relType → euid[]
   * e.g. { communicates_with: ['host:D3F5C9B9-...', 'user:bob@corp'] }
   */
  relationships: Record<string, string[]>;
}
